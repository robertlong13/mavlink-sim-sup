import { log, hr } from './logger.ts';
import { RawStore } from './state/raw.ts';
import type { DecodedMavlink } from './state/raw.ts';

const WS_URL = 'ws://127.0.0.1:56781/'; // hard-coded for now

let ws: WebSocket | null = null;

const mavLinkProcessor = new window.MAVLink20Processor();
const rawStore = new RawStore();

function connect() {
  if (ws) return;
  log('connecting', WS_URL);
  ws = new WebSocket(WS_URL);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    log('websocket open');
    hr();
  };

  ws.onmessage = (ev: MessageEvent) => {
    const msgBuf = new Uint8Array(ev.data);
    const result = mavLinkProcessor.decode(msgBuf);

    const payload: Record<string, any> = {};
    for (const key of result.fieldnames) {
      payload[key] = result[key];
    }

    const decodedMsg: DecodedMavlink = {
      t: Date.now(),
      sysid: result._header.srcSystem,
      compid: result._header.srcComponent,
      msgId: result._id,
      payload: payload,
    };

    rawStore.apply(decodedMsg);
  };

  ws.onerror = e => {
    log('websocket error', String(e));
  };

  ws.onclose = e => {
    log('websocket close', `code=${e.code} reason=${e.reason}`);
    ws = null;
    // simple retry
    setTimeout(connect, 2000);
  };
}

connect();
