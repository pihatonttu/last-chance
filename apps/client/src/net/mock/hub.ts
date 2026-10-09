/**
 * Where mock connections go. Every tab in mock mode has its own MockServer; a tab that
 * owns a game also serves it to other tabs of the same browser over a BroadcastChannel,
 * so the teacher view and a student view can run side by side (/host in one tab,
 * /play in another). A code that no tab owns becomes a local demo game.
 */
import type { DebriefData } from '@saari/debrief';
import type { ClientMessage, CreateGameRequest, CreateGameResponse, GameStatusResponse, ServerMessage } from '@saari/protocol';
import { MockServer, type MockConnection, type MockSink } from './server.ts';

export interface Endpoint {
  connect(sink: MockSink, lost: () => void): MockConnection;
}

type Wire =
  | { kind: 'find'; req: string; code: string }
  | { kind: 'found'; req: string; owner: string }
  | { kind: 'open'; owner: string; conn: string }
  | { kind: 'send'; owner: string; conn: string; msg: ClientMessage }
  | { kind: 'close'; owner: string; conn: string }
  | { kind: 'deliver'; conn: string; msg: ServerMessage }
  | { kind: 'status'; req: string; code: string }
  | { kind: 'status-reply'; req: string; status: GameStatusResponse }
  | { kind: 'debrief'; req: string; token: string; remove: boolean }
  | { kind: 'debrief-reply'; req: string; debrief: DebriefData | null; removed: boolean }
  | { kind: 'bye'; owner: string };

const CHANNEL = 'saari-mock';
const FIND_TIMEOUT_MS = 300;

const tabId = Math.random().toString(36).slice(2);
let server: MockServer | null = null;
let channel: BroadcastChannel | null = null;
const remoteSinks = new Map<string, { sink: MockSink; lost: () => void }>();
const pending = new Map<string, (wire: Wire) => void>();
const served = new Map<string, MockConnection>();

function randomId(): string {
  return `${tabId}-${Math.random().toString(36).slice(2)}`;
}

function getChannel(): BroadcastChannel | null {
  if (channel || typeof BroadcastChannel === 'undefined') return channel;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (event: MessageEvent<Wire>) => onWire(event.data);
  globalThis.addEventListener?.('pagehide', () => channel?.postMessage({ kind: 'bye', owner: tabId } satisfies Wire));
  return channel;
}

function post(wire: Wire): void {
  getChannel()?.postMessage(wire);
}

function onWire(wire: Wire): void {
  const local = server;
  switch (wire.kind) {
    case 'find':
      if (local?.hasRoom(wire.code)) post({ kind: 'found', req: wire.req, owner: tabId });
      return;
    case 'status':
      if (local?.hasRoom(wire.code)) post({ kind: 'status-reply', req: wire.req, status: local.status(wire.code) });
      return;
    case 'debrief': {
      const debrief = local?.getDebrief(wire.token) ?? null;
      if (!debrief) return;
      const removed = wire.remove ? local!.deleteDebrief(wire.token) : false;
      post({ kind: 'debrief-reply', req: wire.req, debrief, removed });
      return;
    }
    case 'open':
      if (wire.owner !== tabId || !local) return;
      served.set(
        wire.conn,
        local.connect((msg) => post({ kind: 'deliver', conn: wire.conn, msg })),
      );
      return;
    case 'send':
      if (wire.owner === tabId) served.get(wire.conn)?.send(wire.msg);
      return;
    case 'close':
      if (wire.owner !== tabId) return;
      served.get(wire.conn)?.close();
      served.delete(wire.conn);
      return;
    case 'deliver':
      remoteSinks.get(wire.conn)?.sink(wire.msg);
      return;
    case 'bye':
      for (const [id, remote] of remoteSinks) {
        if (id.startsWith(`${wire.owner}:`)) {
          remoteSinks.delete(id);
          remote.lost();
        }
      }
      return;
    case 'found':
    case 'status-reply':
    case 'debrief-reply':
      pending.get(wire.req)?.(wire);
      return;
  }
}

/** Asks the other tabs; resolves with the first reply or null after the timeout. */
function ask(wire: Wire & { req: string }, timeoutMs = FIND_TIMEOUT_MS): Promise<Wire | null> {
  if (!getChannel()) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(wire.req);
      resolve(null);
    }, timeoutMs);
    pending.set(wire.req, (reply) => {
      clearTimeout(timer);
      pending.delete(wire.req);
      resolve(reply);
    });
    post(wire);
  });
}

export function getMockServer(): MockServer {
  if (!server) {
    server = new MockServer();
    getChannel();
  }
  return server;
}

const localEndpoint: Endpoint = {
  connect: (sink) => getMockServer().connect(sink),
};

function remoteEndpoint(owner: string): Endpoint {
  return {
    connect(sink, lost) {
      const conn = `${owner}:${randomId()}`;
      remoteSinks.set(conn, { sink, lost });
      post({ kind: 'open', owner, conn });
      return {
        send: (msg) => post({ kind: 'send', owner, conn, msg }),
        close: () => {
          remoteSinks.delete(conn);
          post({ kind: 'close', owner, conn });
        },
      };
    },
  };
}

/** Local game if this tab has it, else a tab that owns it, else a new local demo game. */
export async function resolveEndpoint(code: string): Promise<Endpoint> {
  const local = getMockServer();
  if (local.hasRoom(code)) return localEndpoint;
  const reply = await ask({ kind: 'find', req: randomId(), code });
  if (reply?.kind === 'found') return remoteEndpoint(reply.owner);
  return localEndpoint;
}

export const mockApi = {
  createGame(request: CreateGameRequest): CreateGameResponse {
    return getMockServer().createGame(request);
  },
  async status(code: string): Promise<GameStatusResponse> {
    const local = getMockServer();
    if (local.hasRoom(code)) return local.status(code);
    const reply = await ask({ kind: 'status', req: randomId(), code });
    if (reply?.kind === 'status-reply') return reply.status;
    return local.status(code);
  },
  async debrief(token: string, remove: boolean): Promise<{ debrief: DebriefData | null; removed: boolean }> {
    const local = getMockServer();
    const debrief = local.getDebrief(token);
    if (debrief) return { debrief, removed: remove ? local.deleteDebrief(token) : false };
    const reply = await ask({ kind: 'debrief', req: randomId(), token, remove });
    if (reply?.kind === 'debrief-reply') return { debrief: reply.debrief, removed: reply.removed };
    return { debrief: null, removed: false };
  },
};
