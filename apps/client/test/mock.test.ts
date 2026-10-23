import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROTOCOL_VERSION, type ClientMessage, type ServerMessage, type TickerEvent } from '@saari/protocol';
import { createGame, DEFAULT_PARAMS, type Game, type GameParams } from '@saari/rules';
import { fallbackDebrief } from '../src/net/mock/debrief-fallback.ts';
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

/** No game is ever lost (docs/10-arktinen.md §4b): for tests that play to the last month. */
const NEVER_LOSE: GameParams = { ...DEFAULT_PARAMS, lossThreshold: { short: -1_000_000, normal: -1_000_000 } };

/** Every game is lost at its first month end. */
const ALWAYS_LOSE: GameParams = { ...DEFAULT_PARAMS, lossThreshold: { short: 1_000, normal: 1_000 } };

/** Every ticker kind there is; the Record keeps this list complete when a kind is added. */
const TICKER_KINDS: Record<TickerEvent['kind'], true> = {
  'spring-found': true,
  'field-ready': true,
  'quarry-ready': true,
  'forest-cleared': true,
  built: true,
  tie: true,
  'player-joined': true,
  'food-short': true,
  'hard-frost-coming': true,
  'wood-short': true,
  'giving-up': true,
};

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
    // Ten votes mean the village never gave up on the way.
    expect(student.state.game?.result).toHaveProperty('lost', false);
    expect(host.state.game?.result).toHaveProperty('lost', false);
    // The ticker only ever carries kinds the client knows how to show.
    const kinds = host.of('ticker').map((m) => m.event.kind);
    expect(kinds.length).toBeGreaterThan(0);
    for (const kind of kinds) expect(TICKER_KINDS).toHaveProperty(kind);
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
    // The student's own badges, never the host's (docs/09 §2.3).
    expect(student.of('badges')).toHaveLength(1);
    expect(student.state.badges?.length).toBeGreaterThan(0);
    expect(host.of('badges')).toHaveLength(0);
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

  describe('warnings and the lost result', () => {
    /** One idle student in a normal game on the given rules; the host has started it. */
    async function idleGame(params: GameParams) {
      const server = new MockServer({ seed: 7, trialBots: 0, demoBots: 0, voteSeconds: 6, summarySeconds: 2, params });
      const { code, hostToken } = server.createGame({ length: 'short', actionSeconds: 45 });
      const host = connect(server);
      host.send({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
      const student = connect(server);
      student.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Aapo' });
      await flush();
      const mark = host.messages.length;
      host.send({ t: 'host', command: { type: 'start' } });
      await flush();
      return { host, student, mark };
    }
    const tickersSince = (client: TestClient, mark: number, kind: TickerEvent['kind']) =>
      client.messages.slice(mark).flatMap((m) => (m.t === 'ticker' && m.event.kind === kind ? [m.event] : []));
    const MONTH_MS = (45 + 6 + 2) * 1000;

    it('warns about a hard frost the month before', async () => {
      const { host, mark: first } = await idleGame(NEVER_LOSE);
      const hardAt = DEFAULT_PARAMS.weather.hardAt;
      let mark = first;
      let warned = 0;
      let quiet = 0;
      for (let month = 1; month <= 10; month++) {
        expect(host.state.game?.month).toBe(month);
        const forecast = host.state.game!.village.forecast;
        const frost = tickersSince(host, mark, 'hard-frost-coming');
        if (forecast !== null && forecast <= hardAt) {
          expect(frost).toEqual([{ kind: 'hard-frost-coming', temperature: forecast }]);
          warned += 1;
        } else {
          expect(frost).toEqual([]);
          quiet += 1;
        }
        mark = host.messages.length;
        await vi.advanceTimersByTimeAsync(MONTH_MS);
      }
      expect(host.state.game?.phase).toBe('ended');
      expect(warned).toBeGreaterThan(0);
      expect(quiet).toBeGreaterThan(0);
    });

    it('warns when the wood will not keep the fire going', async () => {
      const cold = await idleGame({ ...NEVER_LOSE, startWoodPerVillager: 0 });
      const village = cold.host.state.game!.village;
      expect(village.heatNeed).toBeGreaterThan(0);
      expect(tickersSince(cold.host, cold.mark, 'wood-short')).toEqual([
        { kind: 'wood-short', missing: village.heatNeed - village.resources.wood },
      ]);
      const warm = await idleGame({ ...NEVER_LOSE, startWoodPerVillager: 50 });
      expect(tickersSince(warm.host, warm.mark, 'wood-short')).toEqual([]);
    });

    it('warns when the village is close to giving up', async () => {
      const margin = DEFAULT_PARAMS.lossWarningMargin;
      const limit = (n: number): GameParams => ({ ...DEFAULT_PARAMS, lossThreshold: { short: n, normal: n } });
      const close = await idleGame(limit(-margin + 10));
      expect(tickersSince(close.host, close.mark, 'giving-up')).toEqual([{ kind: 'giving-up' }]);
      // Exactly at limit + margin is not close yet; neither is the tuned default.
      const edge = await idleGame(limit(-margin));
      expect(tickersSince(edge.host, edge.mark, 'giving-up')).toEqual([]);
      const calm = await idleGame(DEFAULT_PARAMS);
      expect(tickersSince(calm.host, calm.mark, 'giving-up')).toEqual([]);
    });

    it('a lost game ends after the summary with result.lost, badges and the debrief still come', async () => {
      const { host, student } = await idleGame(ALWAYS_LOSE);
      await vi.advanceTimersByTimeAsync(45_000 + 6_000);
      // The summary of the month the village gave up in still shows.
      expect(host.state.game?.phase).toBe('summary');
      expect(host.state.game?.result).toBeNull();
      expect(host.state.game?.lastReport?.month).toBe(1);
      await vi.advanceTimersByTimeAsync(2_000);
      for (const client of [host, student]) {
        expect(client.state.game?.phase).toBe('ended');
        expect(client.state.game?.month).toBe(1);
        expect(client.state.game?.result).toMatchObject({ early: false, lost: true });
      }
      expect(host.of('debrief')).toHaveLength(1);
      expect(host.of('debrief')[0]!.debrief).toMatchObject({ lost: true, endedEarly: false, monthsPlayed: 1 });
      expect(student.of('badges')).toHaveLength(1);
      expect(host.of('badges')).toHaveLength(0);
    });
  });

  it('the stand-in debrief calls a lost game lost and a teacher-ended one early', () => {
    const play = (finish: (game: Game) => void): Game => {
      const game = createGame({ seed: 7, length: 'short', params: ALWAYS_LOSE, clock: () => 0 });
      game.addPlayer('p1');
      game.start();
      finish(game);
      return game;
    };
    const lost = play((game) => {
      game.endActionPhase();
      game.endVotePhase();
      game.nextMonth();
    });
    expect(lost.lost).toBe(true);
    const lostDebrief = fallbackDebrief(lost, []);
    expect(lostDebrief).toMatchObject({ lost: true, endedEarly: false, monthsPlayed: 1 });
    expect(lostDebrief.questions[0]).toEqual({ id: 'lost', params: { month: 1 } });
    const stopped = play((game) => game.endEarly());
    expect(stopped.lost).toBe(false);
    expect(fallbackDebrief(stopped, [])).toMatchObject({ lost: false, endedEarly: true, monthsPlayed: 0 });
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
