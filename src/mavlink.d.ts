// TypeScript declaration for browser global MAVLink20Processor

declare class MAVLink20Processor {
  constructor(logger?: any, srcSystem?: number, srcComponent?: number);
  decode(msgbuf: Uint8Array): any;
  // Add more methods as needed
}

interface Window {
  MAVLink20Processor: typeof MAVLink20Processor;
}

declare var MAVLink20Processor: typeof MAVLink20Processor;
