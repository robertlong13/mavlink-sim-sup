import { log, hr } from './logger.ts';

const WS_URL = 'ws://127.0.0.1:56781/'; // hard-coded for now

let ws: WebSocket | null = null;

const mavLinkProcessor = new window.MAVLink20Processor();

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
    log('decoded message', result);
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
