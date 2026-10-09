import { describe, expect, it } from 'vitest';
import {
  applyLocal,
  applyServerMessage,
  EFFECT_TTL_MS,
  initialState,
  MAX_TICKER,
  remainingMs,
  remainingShare,
  tileAt,
  type ClientState,
} from '../src/state/reducer.ts';
import { gameView, player, tile, timer, village, you } from './fixtures.ts';

const NOW = 1_000_000;

function welcomed(over: Parameters<typeof gameView>[0] = {}): ClientState {
  return applyServerMessage(
    initialState(),
    { t: 'welcome', role: 'player', game: gameView(over), you: you(), playerToken: 'tok', serverTime: NOW + 500 },
    NOW,
  );
}

describe('applyServerMessage', () => {
  it('welcome stores the game, you, token, role and the clock offset', () => {
    const s = welcomed();
    expect(s.welcomed).toBe(true);
    expect(s.role).toBe('player');
    expect(s.game?.code).toBe('123456');
    expect(s.you?.nickname).toBe('Testi');
    expect(s.playerToken).toBe('tok');
    expect(s.clockOffset).toBe(500);
    expect(s.phaseKey).toBe('1:action');
    expect(s.phaseTotalMs).toBe(60_000);
  });

  it('welcome without a token keeps the stored one and clears refusals', () => {
    let s = applyServerMessage(initialState(), { t: 'refused-join', reason: 'nickname-taken' }, NOW);
    expect(s.joinRefusal).toBe('nickname-taken');
    s = { ...s, playerToken: 'old' };
    s = applyServerMessage(s, { t: 'welcome', role: 'host', game: gameView(), you: null, serverTime: NOW }, NOW);
    expect(s.playerToken).toBe('old');
    expect(s.joinRefusal).toBeNull();
    expect(s.role).toBe('host');
  });

  it('patch merges tiles by position and replaces the given parts only', () => {
    const s0 = welcomed();
    const forest = tile(2, 1, { terrain: 'forest', stock: 30 });
    const s1 = applyServerMessage(
      s0,
      { t: 'patch', tiles: [forest], village: village({ resources: { food: 1, wood: 2, stone: 3 } }), playerCount: 12 },
      NOW,
    );
    expect(tileAt(s1.game, 2, 1)).toEqual(forest);
    expect(tileAt(s1.game, 0, 0)).toBe(tileAt(s0.game, 0, 0));
    expect(s1.game?.village.resources).toEqual({ food: 1, wood: 2, stone: 3 });
    expect(s1.game?.playerCount).toBe(12);
    expect(s1.game?.timer).toBe(s0.game?.timer);
    // The original state is untouched (pure reducer).
    expect(tileAt(s0.game, 2, 1)?.terrain).toBe('meadow');
  });

  it('patch ignores tiles outside the map and does nothing before a game', () => {
    const s0 = welcomed();
    const s1 = applyServerMessage(s0, { t: 'patch', tiles: [tile(9, 9)] }, NOW);
    expect(s1.game?.map?.tiles).toHaveLength(6);
    const empty = initialState();
    expect(applyServerMessage(empty, { t: 'patch', playerCount: 3 }, NOW)).toBe(empty);
  });

  it('patch players and vote reach the game view', () => {
    const s0 = welcomed();
    const vote = { options: [], counts: { none: 2 }, votesCast: 2 };
    const s1 = applyServerMessage(s0, { t: 'patch', players: [player('a')], vote }, NOW);
    expect(s1.game?.players.map((p) => p.id)).toEqual(['a']);
    expect(s1.game?.vote).toEqual(vote);
  });

  it('a new phase resets the countdown total and clears the preview', () => {
    let s = welcomed();
    s = applyServerMessage(s, { t: 'preview', x: 1, y: 1, preview: { kind: 'plow', available: true, yield: { type: 'none' } } }, NOW);
    expect(s.preview?.x).toBe(1);
    s = applyServerMessage(s, { t: 'patch', timer: timer({ remainingMs: 90_000 }) }, NOW);
    expect(s.phaseTotalMs).toBe(90_000);
    s = applyServerMessage(s, { t: 'game', game: gameView({ phase: 'vote', timer: timer({ remainingMs: 30_000 }) }) }, NOW);
    expect(s.phaseKey).toBe('1:vote');
    expect(s.phaseTotalMs).toBe(30_000);
    expect(s.preview).toBeNull();
  });

  it('the same phase keeps the largest remaining time seen (+30 s grows it)', () => {
    let s = welcomed();
    s = applyServerMessage(s, { t: 'game', game: gameView({ timer: timer({ remainingMs: 20_000 }) }) }, NOW);
    expect(s.phaseTotalMs).toBe(60_000);
  });

  it('act-result keeps the last outcome with a fresh id', () => {
    let s = welcomed();
    s = applyServerMessage(s, { t: 'act-result', x: 1, y: 0, ok: true, gain: { wood: 10 } }, NOW);
    expect(s.lastAct).toMatchObject({ ok: true, x: 1, y: 0, gain: { wood: 10 } });
    // The actor's own floating "+10 puuta" (the server sends 'effect' only to the others).
    expect(s.effects).toEqual([expect.objectContaining({ x: 1, y: 0, gain: { wood: 10 } })]);
    const first = s.lastAct!.id;
    s = applyServerMessage(s, { t: 'act-result', x: 1, y: 0, ok: false, reason: 'no-actions-left' }, NOW);
    expect(s.lastAct).toMatchObject({ ok: false, reason: 'no-actions-left' });
    expect(s.effects).toHaveLength(1);
    expect(s.lastAct!.id).toBeGreaterThan(first);
  });

  it('vote-result ok marks the option this client sent as its vote', () => {
    let s = welcomed();
    s = applyLocal(s, { type: 'vote-sent', option: 'shelter-1' });
    expect(s.pendingVote).toBe('shelter-1');
    s = applyServerMessage(s, { t: 'vote-result', ok: true }, NOW);
    expect(s.you?.vote).toBe('shelter-1');
    expect(s.pendingVote).toBeNull();
    expect(s.lastVote).toMatchObject({ ok: true, option: 'shelter-1' });
  });

  it('vote-result refusal keeps the old vote', () => {
    let s = welcomed();
    s = applyLocal(s, { type: 'vote-sent', option: 'school-1' });
    s = applyServerMessage(s, { t: 'vote-result', ok: false, reason: 'blocked' }, NOW);
    expect(s.you?.vote).toBeNull();
    expect(s.lastVote).toMatchObject({ ok: false, reason: 'blocked' });
  });

  it('effects are kept for a while and then pruned', () => {
    let s = welcomed();
    s = applyServerMessage(s, { t: 'effect', x: 1, y: 1, gain: { food: 10 } }, NOW);
    expect(s.effects).toHaveLength(1);
    s = applyServerMessage(s, { t: 'effect', x: 0, y: 1, gain: { wood: 10 } }, NOW + EFFECT_TTL_MS - 1);
    expect(s.effects).toHaveLength(2);
    s = applyServerMessage(s, { t: 'pong', serverTime: NOW }, NOW + EFFECT_TTL_MS + 10);
    expect(s.effects).toHaveLength(1);
    expect(s.effects[0]?.gain).toEqual({ wood: 10 });
  });

  it('the ticker keeps the newest items with the month they happened in', () => {
    let s = welcomed();
    for (let i = 0; i < MAX_TICKER + 3; i++) s = applyServerMessage(s, { t: 'ticker', event: { kind: 'tie' } }, NOW + i);
    s = applyServerMessage(s, { t: 'ticker', event: { kind: 'spring-found' } }, NOW);
    expect(s.ticker).toHaveLength(MAX_TICKER);
    expect(s.ticker.at(-1)?.event.kind).toBe('spring-found');
    expect(s.ticker.at(-1)?.month).toBe(1);
  });

  it('you, debrief, kicked, error and pong', () => {
    let s = welcomed();
    s = applyServerMessage(s, { t: 'you', you: you({ actionsLeft: 1 }) }, NOW);
    expect(s.you?.actionsLeft).toBe(1);
    s = applyServerMessage(s, { t: 'kicked' }, NOW);
    expect(s.kicked).toBe(true);
    s = applyServerMessage(s, { t: 'error', message: 'oops' }, NOW);
    expect(s.error).toBe('oops');
    s = applyLocal(s, { type: 'clear-error' });
    expect(s.error).toBeNull();
    s = applyServerMessage(s, { t: 'pong', serverTime: NOW + 2000 }, NOW);
    expect(s.clockOffset).toBe(2000);
  });

  it('debrief stores the named copy and the stored token', () => {
    const s = applyServerMessage(
      welcomed(),
      { t: 'debrief', debrief: { version: 1, named: true } as never, storedToken: 'abc123abc' },
      NOW,
    );
    expect(s.debrief).toMatchObject({ named: true });
    expect(s.storedToken).toBe('abc123abc');
  });

  it('status changes are local events', () => {
    const s0 = initialState();
    const s1 = applyLocal(s0, { type: 'status', status: 'open' });
    expect(s1.status).toBe('open');
    expect(applyLocal(s1, { type: 'status', status: 'open' })).toBe(s1);
  });
});

describe('timer helpers', () => {
  it('counts down from phaseEndsAt with the clock offset', () => {
    const t = timer({ phaseEndsAt: NOW + 10_000, remainingMs: 10_000 });
    expect(remainingMs(t, 0, NOW)).toBe(10_000);
    expect(remainingMs(t, 2_000, NOW)).toBe(8_000);
    expect(remainingMs(t, 0, NOW + 20_000)).toBe(0);
  });

  it('a paused timer shows the frozen remaining time', () => {
    const t = timer({ phaseEndsAt: null, remainingMs: 7_000, paused: true });
    expect(remainingMs(t, 0, NOW + 99_999)).toBe(7_000);
  });

  it('share of the phase left for the bar', () => {
    const t = timer({ phaseEndsAt: NOW + 30_000 });
    expect(remainingShare({ phaseTotalMs: 60_000, clockOffset: 0 }, t, NOW)).toBeCloseTo(0.5);
    expect(remainingShare({ phaseTotalMs: 0, clockOffset: 0 }, t, NOW)).toBe(0);
  });
});
