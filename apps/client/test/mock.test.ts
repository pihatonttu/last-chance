import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROTOCOL_VERSION, type ClientMessage, type ServerMessage } from '@saari/protocol';
import { MockServer } from '../src/net/mock/server.ts';
import { MockTransport } from '../src/net/mock/transport.ts';
import { applyServerMessage, initialState, type ClientState } from '../src/state/reducer.ts';

interface TestClient {
  state: ClientState;
  messages: ServerMessage[];
  send(message: ClientMessage): void;
  close(): void;
  of<T extends ServerMessage['t']>(t: T): Extract<ServerMessage, { t: T }>[];
}

function connect(server: MockServer): TestClient {
  const client: TestClient = {
    state: initialState(),
    messages: [],
    send: () => undefined,
    close: () => undefined,
    of(t) {
      return client.messages.filter((m) => m.t === t) as never;
    },
  };
  const conn = server.connect((message) => {
    client.messages.push(message);
    client.state = applyServerMessage(client.state, message, Date.now());
  });
  client.send = (message) => conn.send(message);
  client.close = () => conn.close();
  return client;
}

const flush = () => vi.advanceTimersByTimeAsync(0);

function newServer(): MockServer {
  return new MockServer({ seed: 7, trialBots: 4, demoBots: 0, botStepMs: 40, voteSeconds: 6, summarySeconds: 2 });
}

/** Lets the student use every action it can, nearest to the landing first. */
async function useActions(student: TestClient): Promise<number> {
  let done = 0;
  for (let guard = 0; guard < 40; guard++) {
    const game = student.state.game;
    const you = student.state.you;
    if (!game?.map || game.phase !== 'action' || !you || you.actionsLeft === 0) break;
    const { landing } = game.map;
    const candidates = game.map.tiles
      .filter((t) => Math.max(Math.abs(t.x - landing.x), Math.abs(t.y - landing.y)) <= 2)
      .sort((a, b) => Math.abs(a.x - landing.x) + Math.abs(a.y - landing.y) - (Math.abs(b.x - landing.x) + Math.abs(b.y - landing.y)));
    let acted = false;
    for (const tile of candidates) {
      student.send({ t: 'inspect', x: tile.x, y: tile.y });
      await flush();
      if (student.state.preview?.preview.available) {
        student.send({ t: 'act', x: tile.x, y: tile.y });
        await flush();
        acted = true;
        done += 1;
        break;
      }
    }
    if (!acted) break;
  }
  return done;
}

describe('MockServer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays a short trial game to the end with a host, a student and bots', async () => {
    const server = newServer();
    const { code, hostToken } = server.createGame({ length: 'short', actionSeconds: 45, trial: true });

    const host = connect(server);
    host.send({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
    await flush();
    expect(host.state.role).toBe('host');
    expect(host.state.game?.phase).toBe('lobby');
    expect(host.state.game?.players).toHaveLength(4);

    // The student goes through the real MockTransport.
    const transport = new MockTransport(code, async () => ({ connect: (sink) => server.connect(sink) }));
    const student: TestClient = {
      state: initialState(),
      messages: [],
      send: (m) => void transport.send(m),
      close: () => transport.close(),
      of(t) {
        return student.messages.filter((m) => m.t === t) as never;
      },
    };
    transport.onMessage((message) => {
      student.messages.push(message);
      student.state = applyServerMessage(student.state, message, Date.now());
    });
    transport.onStatus((status) => {
      if (status === 'open') transport.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Testi' });
    });
    transport.connect();
    await flush();
    expect(student.state.role).toBe('player');
    expect(student.state.you?.nickname).toBe('Testi');
    expect(student.state.playerToken).toBeTruthy();
    expect(student.state.game?.players).toEqual([]);
    expect(host.state.game?.players.map((p) => p.nickname)).toContain('Testi');
    expect(host.state.game?.playerCount).toBe(5);

    host.send({ t: 'host', command: { type: 'start' } });
    await flush();
    expect(host.state.game?.phase).toBe('action');
    expect(student.state.game?.map).not.toBeNull();
    expect(student.state.game?.map?.tiles.length).toBe((student.state.game?.map?.width ?? 0) * (student.state.game?.map?.height ?? 0));

    let actions = 0;
    let votes = 0;
    let lastPhase = '';
    for (let step = 0; step < 4000 && host.state.game?.phase !== 'ended'; step++) {
      const phase = `${student.state.game?.month}:${student.state.game?.phase}`;
      if (phase !== lastPhase) {
        lastPhase = phase;
        if (student.state.game?.phase === 'action') actions += await useActions(student);
        if (student.state.game?.phase === 'vote' && student.state.game.vote) {
          const option = student.state.game.vote.options.find((o) => o.blocked.length === 0)!;
          student.send({ t: 'vote', option: option.id });
          await flush();
          expect(student.of('vote-result').at(-1)).toEqual({ t: 'vote-result', ok: true });
          votes += 1;
        }
      }
      await vi.advanceTimersByTimeAsync(250);
    }

    expect(host.state.game?.phase).toBe('ended');
    expect(student.state.game?.phase).toBe('ended');
    expect(student.state.game?.result?.grade).toBeGreaterThanOrEqual(1);
    expect(student.state.game?.result?.grade).toBeLessThanOrEqual(6);
    expect(student.state.game?.result?.early).toBe(false);
    expect(actions).toBeGreaterThan(5);
    expect(votes).toBe(10);
    expect(student.of('act-result').some((m) => m.ok)).toBe(true);
    // Bots' deeds arrive as effects; the student's own come back as act-results only.
    expect(student.of('effect').length).toBeGreaterThan(0);
    expect(student.of('you').length).toBeGreaterThan(0);
    expect(host.state.ticker.length).toBeGreaterThan(0);

    const debrief = host.of('debrief');
    expect(debrief).toHaveLength(1);
    expect(debrief[0]!.storedToken).toBeNull();
    expect(debrief[0]!.debrief.monthsPlayed).toBe(10);
    expect(debrief[0]!.debrief.named).toBe(true);
    expect(debrief[0]!.debrief.players.map((p) => p.label)).toContain('Testi');
    // Students never get the debrief or other players' names (P34).
    expect(student.of('debrief')).toHaveLength(0);
    for (const m of student.messages) {
      if (m.t === 'game' || m.t === 'welcome') expect(m.game.players).toEqual([]);
      if (m.t === 'patch') expect(m.players).toBeUndefined();
    }
    transport.close();
  }, 30_000);

  it('stores a pseudonymised copy of a normal game and can delete it', async () => {
    const server = newServer();
    const { code, hostToken } = server.createGame({ length: 'short', trial: false });
    const host = connect(server);
    host.send({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
    const student = connect(server);
    student.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Liisa' });
    await flush();
    host.send({ t: 'host', command: { type: 'start' } });
    await flush();
    host.send({ t: 'host', command: { type: 'end' } });
    await flush();
    expect(host.state.game?.result?.early).toBe(true);
    const token = host.state.storedToken!;
    expect(token).toBeTruthy();
    const stored = server.getDebrief(token)!;
    expect(stored.named).toBe(false);
    expect(stored.players.map((p) => p.label)).not.toContain('Liisa');
    expect(server.deleteDebrief(token)).toBe(true);
    expect(server.getDebrief(token)).toBeNull();
  });

  it('handles rejoin, taken names, renames, kicks and bad hellos', async () => {
    const server = new MockServer({ seed: 3, trialBots: 0, demoBots: 0, autoCreate: false });
    const { code, hostToken } = server.createGame({ length: 'normal' });
    const host = connect(server);
    host.send({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken: 'wrong' });
    await flush();
    expect(host.state.joinRefusal).toBe('bad-token');
    host.send({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
    await flush();
    expect(host.state.role).toBe('host');

    const a = connect(server);
    a.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Aino' });
    await flush();
    const token = a.state.playerToken!;

    const b = connect(server);
    b.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'aino' });
    await flush();
    expect(b.state.joinRefusal).toBe('nickname-taken');

    // After a disconnect the same nickname rejoins the same player (P23).
    a.close();
    await flush();
    expect(host.state.game?.players[0]?.connected).toBe(false);
    b.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Aino' });
    await flush();
    expect(b.state.you?.id).toBe(a.state.you?.id);

    const c = connect(server);
    c.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, playerToken: token });
    await flush();
    expect(c.state.you?.id).toBe(a.state.you?.id);

    host.send({ t: 'host', command: { type: 'rename', playerId: c.state.you!.id } });
    await flush();
    expect(c.state.you?.nickname).not.toBe('Aino');
    expect(host.state.game?.players[0]?.nameLocked).toBe(true);

    host.send({ t: 'host', command: { type: 'hide-names', hidden: true } });
    await flush();
    expect(host.state.game?.namesHidden).toBe(true);
    expect(host.state.game?.players[0]?.nickname).toBeNull();

    host.send({ t: 'host', command: { type: 'kick', playerId: c.state.you!.id } });
    await flush();
    expect(c.state.kicked).toBe(true);
    const d = connect(server);
    d.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, playerToken: token });
    await flush();
    expect(d.state.joinRefusal).toBe('kicked');

    const e = connect(server);
    e.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code: '000000', nickname: 'Eero' });
    await flush();
    expect(e.state.joinRefusal).toBe('unknown-game');
    e.send({ t: 'hello-player', protocol: PROTOCOL_VERSION + 1, code, nickname: 'Eero' });
    await flush();
    expect(e.state.joinRefusal).toBe('protocol-mismatch');
    e.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, playerToken: 'nope' });
    await flush();
    expect(e.state.joinRefusal).toBe('bad-token');
  });

  it('sends the floating effect to everyone but the actor, who gets act-result', async () => {
    const server = newServer();
    const { code, hostToken } = server.createGame({ length: 'short' });
    const host = connect(server);
    host.send({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
    const student = connect(server);
    student.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Aapo' });
    await flush();
    host.send({ t: 'host', command: { type: 'start' } });
    await flush();
    expect(await useActions(student)).toBeGreaterThan(0);
    expect(student.of('act-result').filter((m) => m.ok).length).toBeGreaterThan(0);
    expect(student.of('effect')).toHaveLength(0);
    expect(student.state.effects.length).toBeGreaterThan(0);
    expect(host.of('effect').length).toBe(student.of('act-result').filter((m) => m.ok).length);
  });

  it('pauses, resumes and extends the phase timer', async () => {
    const server = newServer();
    const { code, hostToken } = server.createGame({ length: 'short', actionSeconds: 45 });
    const host = connect(server);
    host.send({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
    const student = connect(server);
    student.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Olli' });
    await flush();
    host.send({ t: 'host', command: { type: 'start' } });
    await flush();
    expect(host.state.game?.timer.remainingMs).toBe(45_000);

    host.send({ t: 'host', command: { type: 'pause' } });
    await flush();
    expect(host.state.game?.timer.paused).toBe(true);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(host.state.game?.phase).toBe('action');

    host.send({ t: 'host', command: { type: 'extend' } });
    await flush();
    expect(host.state.game?.timer.remainingMs).toBe(75_000);

    host.send({ t: 'host', command: { type: 'resume' } });
    await flush();
    expect(host.state.game?.timer.paused).toBe(false);
    expect(host.state.game?.timer.phaseEndsAt).toBe(Date.now() + 75_000);
    await vi.advanceTimersByTimeAsync(76_000);
    expect(host.state.game?.phase).not.toBe('action');
  });
});
