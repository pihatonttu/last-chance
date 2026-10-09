import { MockTransport } from './mock/transport.ts';
import { isMock } from './mode.ts';
import type { Transport } from './transport.ts';
import { WebSocketTransport } from './websocket.ts';

/** The transport for this page: the real server, or the in-browser mock with ?mock=1. */
export function createTransport(code: string): Transport {
  return isMock() ? new MockTransport(code) : new WebSocketTransport();
}
