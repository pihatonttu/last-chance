import type { DebriefData } from '@saari/debrief';
import { PROTOCOL_VERSION } from '@saari/protocol';
import { describe, expect, it } from 'vitest';
import { GAME_TTL_MS, Hub, HubFullError, MAX_WRONG_CODES, type HubOptions } from '../src/hub.ts';
import { FakeScheduler } from './fake-clock.ts';
import { fakeDebriefing, fakeNaming, FakePeer, seededRandom } from './fixtures.ts';

function setup(over: Partial<HubOptions> = {}) {
  const clock = new FakeScheduler();
  const saved: DebriefData[] = [];
  const hub = new Hub({
    scheduler: clock,
    store: {
      save: (d) => {
        saved.push(d);
        return 'stored';
      },
    },
    naming: fakeNaming,
    debriefing: fakeDebriefing,
    random: seededRandom(3),
    log: () => {},
    ...over,
  });
  const open = () => {
    const peer = new FakePeer();
    return { peer, conn: hub.open(peer) };
  };
  return { clock, hub, open, saved };
}

const SHORT = { length: 'short', actionSeconds: 60, trial: false } as const;

describe('Hub', () => {
  it('creates games with unique 6-digit codes and secret host tokens', () => {
    const { hub } = setup();
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const created = hub.createGame(SHORT);
      expect(created.code).toMatch(/^[1-9]\d{5}$/);
      expect(created.hostToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
      codes.add(created.code);
    }
    expect(codes.size).toBe(50);
    expect(hub.size).toBe(50);
  });

  it('answers the join page status', () => {
    const { hub } = setup();
    const { code } = hub.createGame(SHORT);
    expect(hub.status(code)).toEqual({ exists: true, joinOpen: true, phase: 'lobby' });
    expect(hub.status('999999') ).toEqual({ exists: false, joinOpen: false, phase: null });
  });

  it('refuses new games when full', () => {
    const { hub } = setup({ maxGames: 2 });
    hub.createGame(SHORT);
    hub.createGame(SHORT);
    expect(() => hub.createGame(SHORT)).toThrow(HubFullError);
  });

  it('creates trial games with bots', () => {
    const { hub, open } = setup();
    const { code, hostToken } = hub.createGame({ ...SHORT, trial: true });
    const { peer, conn } = open();
    conn.receive({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
    expect(peer.last('welcome')?.game).toMatchObject({ trial: true, playerCount: 20 });
  });
});

describe('Connection', () => {
  it('lets the host and players in', () => {
    const { hub, open } = setup();
    const { code, hostToken } = hub.createGame(SHORT);
    const host = open();
    host.conn.receive({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
    expect(host.peer.last('welcome')?.role).toBe('host');
    const player = open();
    player.conn.receive({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Aino' });
    expect(player.peer.last('welcome')?.role).toBe('player');
    host.conn.receive({ t: 'host', command: { type: 'start' } });
    expect(hub.session(code)?.phase).toBe('action');
  });

  it('answers ping at any time', () => {
    const { clock, open } = setup();
    const { peer, conn } = open();
    conn.receive({ t: 'ping' });
    expect(peer.last('pong')).toEqual({ t: 'pong', serverTime: clock.now() });
  });

  it('refuses an old protocol version', () => {
    const { hub, open } = setup();
    const { code } = hub.createGame(SHORT);
    const { peer, conn } = open();
    conn.receive({ t: 'hello-player', protocol: PROTOCOL_VERSION + 1, code, nickname: 'Aino' });
    expect(peer.last('refused-join')).toEqual({ t: 'refused-join', reason: 'protocol-mismatch' });
  });

  it('refuses unknown games and closes after too many wrong codes', () => {
    const { open } = setup();
    const { peer, conn } = open();
    for (let i = 0; i < MAX_WRONG_CODES - 1; i++) {
      conn.receive({ t: 'hello-player', protocol: PROTOCOL_VERSION, code: String(100000 + i), nickname: 'Aino' });
    }
    expect(peer.all('refused-join').every((m) => m.reason === 'unknown-game')).toBe(true);
    expect(peer.closed).toBe(false);
    conn.receive({ t: 'hello-host', protocol: PROTOCOL_VERSION, code: '555555', hostToken: 'x' });
    expect(peer.closed).toBe(true);
  });

  it('counts wrong host tokens as wrong codes', () => {
    const { hub, open } = setup();
    const { code } = hub.createGame(SHORT);
    const { peer, conn } = open();
    for (let i = 0; i < MAX_WRONG_CODES; i++) {
      conn.receive({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken: `guess-${i}` });
    }
    expect(peer.last('refused-join')?.reason).toBe('bad-token');
    expect(peer.closed).toBe(true);
  });

  it('needs a hello first, and only one', () => {
    const { hub, open } = setup();
    const { code } = hub.createGame(SHORT);
    const { peer, conn } = open();
    conn.receive({ t: 'act', x: 1, y: 1 });
    expect(peer.last('error')?.message).toBe('not-joined');
    conn.receive({ t: 'what' });
    expect(peer.last('error')?.message).toBe('bad-message');
    conn.receive({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Aino' });
    conn.receive({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Eero' });
    expect(peer.last('error')?.message).toBe('already-joined');
    expect(hub.session(code)?.playerCount).toBe(1);
  });

  it('a refused join may try again on the same connection', () => {
    const { hub, open } = setup();
    const { code } = hub.createGame(SHORT);
    const { peer, conn } = open();
    conn.receive({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'badword' });
    expect(peer.last('refused-join')?.reason).toBe('nickname-offensive');
    conn.receive({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Aino' });
    expect(peer.last('welcome')?.you?.nickname).toBe('Aino');
  });

  it('a closed connection marks the player disconnected', () => {
    const { hub, open } = setup();
    const { code, hostToken } = hub.createGame(SHORT);
    const host = open();
    host.conn.receive({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
    const player = open();
    player.conn.receive({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Aino' });
    player.conn.closed();
    const players = host.peer.last('patch')?.players;
    expect(players?.[0]).toMatchObject({ nickname: 'Aino', connected: false });
  });

  it('turns an internal error into an error message instead of crashing', () => {
    const lines: string[] = [];
    const broken = {
      ...fakeNaming,
      check: () => {
        throw new Error('checkNickname is not implemented yet');
      },
    };
    const { hub, open } = setup({ naming: broken, log: (l) => lines.push(l) });
    const { code } = hub.createGame(SHORT);
    const { peer, conn } = open();
    conn.receive({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Aino' });
    expect(peer.last('error')?.message).toBe('server-error');
    expect(lines.some((l) => l.includes('not implemented'))).toBe(true);
    expect(lines.join('\n')).not.toContain('Aino');
  });
});

describe('cleanup', () => {
  it('drops ended games two hours after the end', () => {
    const { clock, hub, open } = setup();
    const { code, hostToken } = hub.createGame(SHORT);
    const host = open();
    host.conn.receive({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
    open().conn.receive({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Aino' });
    host.conn.receive({ t: 'host', command: { type: 'start' } });
    host.conn.receive({ t: 'host', command: { type: 'end' } });
    clock.advance(GAME_TTL_MS - 1);
    expect(hub.sweep()).toBe(0);
    clock.advance(1);
    expect(hub.sweep()).toBe(1);
    expect(hub.status(code).exists).toBe(false);
    expect(host.peer.closed).toBe(true);
  });

  it('drops lobbies nobody has touched for two hours, keeps busy ones', () => {
    const { clock, hub, open } = setup();
    const idle = hub.createGame(SHORT);
    const busy = hub.createGame(SHORT);
    clock.advance(GAME_TTL_MS - 1000);
    open().conn.receive({ t: 'hello-player', protocol: PROTOCOL_VERSION, code: busy.code, nickname: 'Aino' });
    clock.advance(1000);
    expect(hub.sweep()).toBe(1);
    expect(hub.status(idle.code).exists).toBe(false);
    expect(hub.status(busy.code).exists).toBe(true);
  });

  it('dispose closes everything', () => {
    const { hub, open } = setup();
    const { code, hostToken } = hub.createGame(SHORT);
    const host = open();
    host.conn.receive({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
    hub.dispose();
    expect(host.peer.closed).toBe(true);
    expect(hub.size).toBe(0);
  });
});
