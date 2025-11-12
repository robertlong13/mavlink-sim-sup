import { RingBuffer } from '../util/ringbuffer.ts';

export interface DecodedMavlink {
  t: number; // timestamp (ms)
  sysid: number;
  compid: number;
  msgId: number;
  payload: Record<string, any>;
}

export interface MsgBrief {
  compid: number;
  msgId: number;
  lastT?: number;
  count: number;
  hzEma?: number;
  stale: boolean;
}

export interface MsgDetail extends MsgBrief {
  lastPayload?: Record<string, any>;
  history?: Array<{ t: number; payload: Record<string, any> }>;
}

type Payload = Record<string, any>;
type HistoryItem = { t: number; payload: Payload };

interface RawEntry {
  lastT?: number;
  lastPayload?: Payload;
  count: number;
  hzEma: number; // exponential moving avg of Hz
  history: RingBuffer<HistoryItem>;
}

type MsgMap = Map<number, RawEntry>; // msgId -> RawEntry
type CompMap = Map<number, MsgMap>; // compid -> MsgMap
type SysMap = Map<number, CompMap>; // sysid -> CompMap

export class RawStore {
  private raw: SysMap = new Map();
  private msgStaleMs = 3000; // default staleness for messages
  private historySize = 64;
  private emaAlpha = 0.2; // smoothing for Hz
  private _now: () => number;

  constructor(opts?: {
    now?: () => number;
    msgStaleMs?: number;
    historySize?: number;
    emaAlpha?: number;
  }) {
    this._now = opts?.now ?? (() => Date.now());
    if (opts?.msgStaleMs != null) this.msgStaleMs = opts.msgStaleMs;
    if (opts?.historySize != null) this.historySize = opts.historySize;
    if (opts?.emaAlpha != null) this.emaAlpha = opts.emaAlpha;
  }

  now(): number {
    return this._now();
  }

  setStaleMs(ms: number) {
    this.msgStaleMs = ms;
  }

  setHistorySize(n: number) {
    if (n <= 0) throw new Error('historySize must be > 0');
    this.historySize = n;
    // resize existing buffers
    for (const [, compMap] of this.raw) {
      for (const [, msgMap] of compMap) {
        for (const [, entry] of msgMap) {
          entry.history.setCapacity(n);
        }
      }
    }
  }

  resetStats() {
    for (const [, compMap] of this.raw) {
      for (const [, msgMap] of compMap) {
        for (const [, entry] of msgMap) {
          entry.count = 0;
          entry.hzEma = 0;
          entry.lastT = undefined;
          entry.lastPayload = undefined;
          entry.history = new RingBuffer<HistoryItem>(this.historySize);
        }
      }
    }
  }

  apply(msg: DecodedMavlink) {
    const { sysid, compid, msgId, t, payload } = msg;
    const compMap = this.ensureCompMap(sysid);
    const msgMap = this.ensureMsgMap(compMap, compid);
    const entry = this.ensureEntry(msgMap, msgId);

    // Stats
    if (entry.lastT != null && t > entry.lastT) {
      const dt = (t - entry.lastT) / 1000;
      const instHz = dt > 0 ? 1 / dt : 0;
      entry.hzEma =
        entry.hzEma === 0 ? instHz : (1 - this.emaAlpha) * entry.hzEma + this.emaAlpha * instHz;
    }
    entry.lastT = t;
    entry.lastPayload = payload;
    entry.count += 1;
    entry.history.push({ t, payload });
  }

  // ----- Lookups -----

  getRaw(
    sysid: number,
    msgId: number,
    compid?: number,
  ): { t?: number; payload?: Payload } | undefined {
    const compMap = this.raw.get(sysid);
    if (!compMap) return undefined;
    if (compid != null) {
      const msgMap = compMap.get(compid);
      const entry = msgMap?.get(msgId);
      if (!entry) return undefined;
      return { t: entry.lastT, payload: entry.lastPayload };
    }
    // choose latest across compids
    let latest: RawEntry | undefined;
    for (const [, msgMap] of compMap) {
      const e = msgMap.get(msgId);
      if (!e) continue;
      if (!latest || (e.lastT ?? 0) > (latest.lastT ?? 0)) latest = e;
    }
    if (!latest) return undefined;
    return { t: latest.lastT, payload: latest.lastPayload };
  }

  listSysids(): number[] {
    return Array.from(this.raw.keys()).sort((a, b) => a - b);
  }

  listCompids(sysid: number): number[] {
    const compMap = this.raw.get(sysid);
    if (!compMap) return [];
    return Array.from(compMap.keys()).sort((a, b) => a - b);
  }

  listMsgIds(sysid: number, compid?: number): number[] {
    const compMap = this.raw.get(sysid);
    if (!compMap) return [];
    const msgIds = new Set<number>();
    if (compid != null) {
      const msgMap = compMap.get(compid);
      if (!msgMap) return [];
      for (const k of msgMap.keys()) msgIds.add(k);
    } else {
      for (const [, msgMap] of compMap) for (const k of msgMap.keys()) msgIds.add(k);
    }
    return Array.from(msgIds.values()).sort((a, b) => a - b);
  }

  getMsgBrief(sysid: number, compid: number, msgId: number): MsgBrief | undefined {
    const entry = this.raw.get(sysid)?.get(compid)?.get(msgId);
    if (!entry) return undefined;
    const lastT = entry.lastT;
    const stale = lastT == null ? true : this._now() - lastT > this.msgStaleMs;
    return {
      compid,
      msgId,
      lastT,
      count: entry.count,
      hzEma: entry.hzEma || undefined,
      stale,
    };
  }

  getMsgDetail(
    sysid: number,
    compid: number,
    msgId: number,
    opts?: { includeHistory?: boolean },
  ): MsgDetail | undefined {
    const entry = this.raw.get(sysid)?.get(compid)?.get(msgId);
    if (!entry) return undefined;
    const base = this.getMsgBrief(sysid, compid, msgId)!;
    return {
      ...base,
      lastPayload: entry.lastPayload,
      history: opts?.includeHistory ? entry.history.toArray() : undefined,
    };
  }

  // ----- internals -----

  private ensureCompMap(sysid: number): CompMap {
    let compMap = this.raw.get(sysid);
    if (!compMap) {
      compMap = new Map();
      this.raw.set(sysid, compMap);
    }
    return compMap;
  }

  private ensureMsgMap(compMap: CompMap, compid: number): MsgMap {
    let msgMap = compMap.get(compid);
    if (!msgMap) {
      msgMap = new Map();
      compMap.set(compid, msgMap);
    }
    return msgMap;
  }

  private ensureEntry(msgMap: MsgMap, msgId: number): RawEntry {
    let e = msgMap.get(msgId);
    if (!e) {
      e = { count: 0, hzEma: 0, history: new RingBuffer<HistoryItem>(this.historySize) };
      msgMap.set(msgId, e);
    }
    return e;
  }
}
