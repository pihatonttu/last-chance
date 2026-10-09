import { availableMoves } from '@saari/bots';
import type { DebriefData } from '@saari/debrief';
import type { GameView, PlayerSummary, ServerMessage } from '@saari/protocol';
import { DEFAULT_PARAMS, type PublicTile } from '@saari/rules';
import { describe, expect, it } from 'vitest';
import { defaultNaming, GameSession, timingFor, type DebriefSink, type SessionOptions } from '../src/session.ts';
import { FakeScheduler } from './fake-clock.ts';
import { fakeDebriefing, fakeNaming, FakePeer, seededRandom } from './fixtures.ts';

const HOST = 'host-secret-token';
const ACTION = 60_000;
const VOTE = 30_000;
const SUMMARY = 8_000;
const MONTH = ACTION + VOTE + SUMMARY;

interface Joined {
  peer: FakePeer;
  id: string;
  token: string;
}

function setup(over: Partial<SessionOptions> = {}) {
  const clock = new FakeScheduler();
  const saved: DebriefData[] = [];
  const store: DebriefSink = {
    save: (d) => {
      saved.push(d);
      return 'stored-1';
    },
  };
  const session = new GameSession({
    code: '123456',
    hostToken: HOST,
    length: 'short',
    actionSeconds: 60,
    trial: false,
    scheduler: clock,
    timing: timingFor(60),
    seed: 7,
    store,
    random: seededRandom(1),
    naming: fakeNaming,
    debriefing: fakeDebriefing,
    log: () => {},
    ...over,
  });
  const host = new FakePeer();
  expect(session.connectHost(host, HOST)).toBe(true);

  const join = (nickname: string): Joined => {
    const peer = new FakePeer();
    const refusal = session.joinPlayer(peer, { nickname });
    expect(refusal).toBeNull();
    const welcome = peer.last('welcome')!;
    return { peer, id: welcome.you!.id, token: welcome.playerToken! };
  };
  const refusal = (hello: { nickname?: string; playerToken?: string }) => {
    const peer = new FakePeer();
    const reason = session.joinPlayer(peer, hello);
    if (reason !== null) expect(peer.last('refused-join')?.reason).toBe(reason);
    return reason;
  };
  const command = (cmd: Extract<Parameters<GameSession['handle']>[1], { t: 'host' }>['command']) =>
    session.handle(host, { t: 'host', command: cmd });
  const useAllActions = (...players: Joined[]) => {
    for (const p of players) {
      for (let guard = 0; guard < 10; guard++) {
        if (session.game.phase !== 'action' || (session.game.player(p.id)?.actionsLeft ?? 0) === 0) break;
        const move = availableMoves(session.game, p.id)[0];
        if (!move) break;
        session.handle(p.peer, { t: 'act', x: move.x, y: move.y });
      }
    }
  };
  return { clock, session, host, saved, join, refusal, command, useAllActions };
}

/** The latest players list the host has received (full view or patch). */
function hostPlayers(host: FakePeer): PlayerSummary[] {
  for (let i = host.messages.length - 1; i >= 0; i--) {
    const m = host.messages[i]!;
    if (m.t === 'patch' && m.players) return m.players;
    if ((m.t === 'game' || m.t === 'welcome') && m.game) return m.game.players;
  }
  return [];
}

function lastGame(peer: FakePeer): GameView {
  for (let i = peer.messages.length - 1; i >= 0; i--) {
    const m = peer.messages[i]!;
    if (m.t === 'game' || m.t === 'welcome') return m.game;
  }
  throw new Error('no game view');
}

describe('lobby', () => {
  it('welcomes a player with a token, a colour and their own view', () => {
    const { host, join } = setup();
    const aino = join('  Aino  ');
    const welcome = aino.peer.last('welcome')!;
    expect(welcome.role).toBe('player');
    expect(welcome.you).toMatchObject({ nickname: 'Aino', color: '#000000', vote: null, removed: false });
    expect(welcome.playerToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(welcome.game).toMatchObject({ code: '123456', phase: 'lobby', map: null, players: [], playerCount: 1 });
    expect(hostPlayers(host)).toEqual([
      expect.objectContaining({ id: aino.id, nickname: 'Aino', connected: true, removed: false, nameLocked: false }),
    ]);
    expect(host.all('patch').some((p) => p.playerCount === 1)).toBe(true);
  });

  it('refuses invalid and offensive nicknames', () => {
    const { refusal } = setup();
    expect(refusal({ nickname: '' })).toBe('nickname-invalid');
    expect(refusal({ nickname: 'x' })).toBe('nickname-invalid');
    expect(refusal({ nickname: 'a<b>' })).toBe('nickname-invalid');
    expect(refusal({})).toBe('nickname-invalid');
    expect(refusal({ nickname: 'BADWORD 9' })).toBe('nickname-offensive');
  });

  it('refuses a nickname that a connected player has, ignoring case', () => {
    const { join, refusal } = setup();
    join('Aino');
    expect(refusal({ nickname: 'aino' })).toBe('nickname-taken');
  });

  it('refuses an unknown player token without a nickname, and falls back to the nickname with one', () => {
    const { session, refusal } = setup();
    expect(refusal({ playerToken: 'nope' })).toBe('bad-token');
    const peer = new FakePeer();
    expect(session.joinPlayer(peer, { playerToken: 'nope', nickname: 'Eero' })).toBeNull();
  });

  it('only accepts the right host token', () => {
    const { session } = setup();
    const peer = new FakePeer();
    expect(session.connectHost(peer, 'wrong')).toBe(false);
    expect(peer.last('refused-join')?.reason).toBe('bad-token');
  });

  it('holds at most 40 players (P15); a full game reports join-closed', () => {
    const { session, join, refusal } = setup();
    for (let i = 0; i < 40; i++) join(`Pelaaja ${i}`);
    expect(session.status().joinOpen).toBe(false);
    expect(refusal({ nickname: 'Myohainen' })).toBe('join-closed');
  });

  it('reports its status for the join page', () => {
    const { session, join } = setup();
    expect(session.status()).toEqual({ exists: true, joinOpen: true, phase: 'lobby' });
    join('Aino');
    expect(session.playerCount).toBe(1);
  });
});

describe('with the real @saari/names', () => {
  it('maps the filter result to join refusals and gives real colours', () => {
    const { session } = setup({ naming: defaultNaming });
    const join = (nickname: string) => {
      const peer = new FakePeer();
      return { reason: session.joinPlayer(peer, { nickname }), peer };
    };
    expect(join('vittu').reason).toBe('nickname-offensive');
    expect(join('a').reason).toBe('nickname-invalid');
    expect(join('x'.repeat(20)).reason).toBe('nickname-invalid');
    expect(join('Ai<no>').reason).toBe('nickname-invalid');
    const ok = join('Aino');
    expect(ok.reason).toBeNull();
    expect(ok.peer.last('welcome')?.you?.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe('phases and timers', () => {
  it('needs at least one player to start, and only the host can start', () => {
    const { session, host, join } = setup();
    session.handle(host, { t: 'host', command: { type: 'start' } });
    expect(host.last('error')?.code).toBe('no-players');
    const aino = join('Aino');
    session.handle(aino.peer, { t: 'host', command: { type: 'start' } });
    expect(aino.peer.last('error')?.code).toBe('not-host');
    expect(session.game.phase).toBe('lobby');
  });

  it('starts the action phase with a timer and sends everyone the island', () => {
    const { clock, session, host, join, command } = setup();
    const aino = join('Aino');
    command({ type: 'start' });
    expect(session.game.phase).toBe('action');
    const view = lastGame(host);
    expect(view).toMatchObject({ phase: 'action', month: 1, totalMonths: 10 });
    expect(view.timer).toEqual({ phaseEndsAt: clock.now() + ACTION, remainingMs: ACTION, phaseMs: ACTION, paused: false });
    expect(view.map!.tiles.length).toBe(view.map!.width * view.map!.height);
    expect(view.vote!.options[0]!.id).toBe('none');
    expect(lastGame(aino.peer).phase).toBe('action');
    expect(aino.peer.last('you')!.you.actionsLeft).toBe(3);
  });

  it('follows the timers: action 60 s, vote 30 s, summary 8 s', () => {
    const { clock, session, join, command } = setup();
    join('Aino');
    command({ type: 'start' });
    clock.advance(ACTION - 1);
    expect(session.game.phase).toBe('action');
    clock.advance(1);
    expect(session.game.phase).toBe('vote');
    clock.advance(VOTE);
    expect(session.game.phase).toBe('summary');
    clock.advance(SUMMARY);
    expect(session.game.phase).toBe('action');
    expect(session.game.month).toBe(2);
  });

  it('uses the action length chosen at creation and the time scale', () => {
    const { clock, session, join, command } = setup({ actionSeconds: 45, timing: timingFor(45, 10) });
    join('Aino');
    command({ type: 'start' });
    clock.advance(4_500);
    expect(session.game.phase).toBe('vote');
    clock.advance(3_000);
    expect(session.game.phase).toBe('summary');
  });

  it('ends the action phase when every connected player has used their actions', () => {
    const { session, join, command, useAllActions } = setup();
    const aino = join('Aino');
    const eero = join('Eero');
    command({ type: 'start' });
    useAllActions(aino);
    expect(session.game.phase).toBe('action');
    session.disconnect(eero.peer);
    // Eero is still a villager but nobody waits for him.
    expect(session.game.phase).toBe('vote');
  });

  it('does not rush through phases when nobody is connected', () => {
    const { clock, session, join, command } = setup();
    const aino = join('Aino');
    command({ type: 'start' });
    session.disconnect(aino.peer);
    expect(session.game.phase).toBe('action');
    clock.advance(ACTION);
    expect(session.game.phase).toBe('vote');
    clock.advance(VOTE - 1);
    expect(session.game.phase).toBe('vote');
  });

  it('ends the vote 3 s after everyone has voted', () => {
    const { clock, session, host, join, command } = setup();
    const aino = join('Aino');
    const eero = join('Eero');
    command({ type: 'start' });
    clock.advance(ACTION);
    session.handle(aino.peer, { t: 'vote', option: 'none' });
    expect(session.game.phase).toBe('vote');
    session.handle(eero.peer, { t: 'vote', option: 'none' });
    expect(host.last('patch')?.timer).toMatchObject({ remainingMs: 3_000, paused: false });
    clock.advance(2_999);
    expect(session.game.phase).toBe('vote');
    clock.advance(1);
    expect(session.game.phase).toBe('summary');
  });

  it('takes the 3 s grace back when a player who has not voted comes back', () => {
    const { clock, session, join, command } = setup();
    const aino = join('Aino');
    const eero = join('Eero');
    command({ type: 'start' });
    clock.advance(ACTION);
    session.disconnect(eero.peer);
    session.handle(aino.peer, { t: 'vote', option: 'none' });
    clock.advance(1_000);
    session.joinPlayer(new FakePeer(), { playerToken: eero.token });
    clock.advance(10_000);
    expect(session.game.phase).toBe('vote');
    clock.advance(VOTE - 11_000);
    expect(session.game.phase).toBe('summary');
  });

  it('plays to the end and shows every client the result', () => {
    const { clock, session, host, join, command, saved } = setup();
    const aino = join('Aino');
    const eero = join('Eero');
    command({ type: 'start' });
    clock.advance(MONTH * 10);
    expect(session.game.phase).toBe('ended');
    for (const peer of [host, aino.peer, eero.peer]) {
      const view = lastGame(peer);
      expect(view.phase).toBe('ended');
      expect(view.result).toEqual({ happiness: session.game.happiness, grade: session.game.grade(), early: false });
      expect(view.timer).toEqual({ phaseEndsAt: null, remainingMs: 0, phaseMs: 0, paused: false });
    }
    const debrief = host.last('debrief')!;
    expect(debrief.debrief.named).toBe(true);
    expect(debrief.debrief.players.map((p) => p.label)).toEqual(['Aino', 'Eero']);
    expect(debrief.storedToken).toBe('stored-1');
    expect(aino.peer.all('debrief')).toEqual([]);
    expect(saved).toHaveLength(1);
    expect(saved[0]!.named).toBe(false);
    expect(JSON.stringify(saved[0])).not.toMatch(/Aino|Eero/);
    expect(clock.pending).toBe(0);
  });

  it('warns the class when the food will not last the month', () => {
    const { join, command, host, session } = setup({ params: { ...DEFAULT_PARAMS, startFoodPerVillager: 0 } });
    join('Aino');
    command({ type: 'start' });
    const need = session.game.foodNeed();
    expect(host.last('ticker')?.event).toEqual({ kind: 'food-short', missing: need });
  });
});

describe('teacher controls', () => {
  it('pause freezes the timer and the game; resume continues', () => {
    const { clock, session, host, join, command } = setup();
    const aino = join('Aino');
    command({ type: 'start' });
    clock.advance(10_000);
    command({ type: 'pause' });
    expect(lastGame(host).timer).toEqual({ phaseEndsAt: null, remainingMs: 50_000, phaseMs: ACTION, paused: true });
    expect(lastGame(aino.peer).timer.paused).toBe(true);
    clock.advance(100_000);
    expect(session.game.phase).toBe('action');
    const move = availableMoves(session.game, aino.id)[0]!;
    session.handle(aino.peer, { t: 'act', x: move.x, y: move.y });
    expect(aino.peer.last('act-result')).toMatchObject({ ok: false, reason: 'wrong-phase' });
    command({ type: 'resume' });
    expect(lastGame(host).timer).toEqual({ phaseEndsAt: clock.now() + 50_000, remainingMs: 50_000, phaseMs: ACTION, paused: false });
    clock.advance(49_999);
    expect(session.game.phase).toBe('action');
    clock.advance(1);
    expect(session.game.phase).toBe('vote');
    expect(session.game.log.filter((e) => e.type === 'teacher').map((e) => e.type === 'teacher' && e.action)).toEqual([
      'pause',
      'resume',
    ]);
  });

  it('adds 30 s to the running phase', () => {
    const { clock, session, host, join, command } = setup();
    join('Aino');
    command({ type: 'start' });
    command({ type: 'extend' });
    expect(host.last('patch')?.timer).toMatchObject({ remainingMs: ACTION + 30_000, phaseMs: ACTION + 30_000 });
    clock.advance(ACTION);
    expect(session.game.phase).toBe('action');
    clock.advance(30_000);
    expect(session.game.phase).toBe('vote');
  });

  it('ends the game early with a debrief of what happened so far', () => {
    const { clock, session, host, join, command, saved } = setup();
    const aino = join('Aino');
    command({ type: 'start' });
    clock.advance(MONTH);
    command({ type: 'end' });
    expect(session.game.phase).toBe('ended');
    expect(lastGame(aino.peer).result).toMatchObject({ early: true });
    expect(host.last('debrief')?.storedToken).toBe('stored-1');
    expect(saved).toHaveLength(1);
    expect(clock.pending).toBe(0);
  });

  it('rename gives a random locked name and reserves the old one', () => {
    const { session, host, join, refusal, command } = setup();
    const aino = join('Aino');
    command({ type: 'rename', playerId: aino.id });
    const renamed = hostPlayers(host).find((p) => p.id === aino.id)!;
    expect(renamed.nickname).toMatch(/^Satunnainen \d+$/);
    expect(renamed.nameLocked).toBe(true);
    expect(aino.peer.last('you')?.you).toMatchObject({ nickname: renamed.nickname });
    expect(refusal({ nickname: 'Aino' })).toBe('nickname-taken');
    // The locked name survives a reload.
    session.disconnect(aino.peer);
    const again = new FakePeer();
    expect(session.joinPlayer(again, { playerToken: aino.token, nickname: 'Aino' })).toBeNull();
    expect(again.last('welcome')?.you?.nickname).toBe(renamed.nickname);
  });

  it('kick removes the player for good', () => {
    const { session, host, join, refusal, command } = setup();
    const aino = join('Aino');
    join('Eero');
    command({ type: 'kick', playerId: aino.id });
    expect(aino.peer.last('kicked')).toEqual({ t: 'kicked' });
    expect(aino.peer.closed).toBe(true);
    expect(refusal({ playerToken: aino.token })).toBe('kicked');
    expect(refusal({ nickname: 'AINO' })).toBe('kicked');
    expect(hostPlayers(host).find((p) => p.id === aino.id)).toMatchObject({ removed: true });
    expect(session.playerCount).toBe(1);
    // A late close of the kicked socket changes nothing.
    session.disconnect(aino.peer);
    expect(session.game.player(aino.id)?.removed).toBe(true);
  });

  it('kicked players do not hold up the phase', () => {
    const { session, join, command, useAllActions } = setup();
    const aino = join('Aino');
    const eero = join('Eero');
    command({ type: 'start' });
    useAllActions(aino);
    command({ type: 'kick', playerId: eero.id });
    expect(session.game.phase).toBe('vote');
  });

  it('hide names blanks nicknames on the projector', () => {
    const { host, join, command } = setup();
    const aino = join('Aino');
    command({ type: 'hide-names', hidden: true });
    const view = lastGame(host);
    expect(view.namesHidden).toBe(true);
    expect(view.players.map((p) => p.nickname)).toEqual([null]);
    expect(lastGame(aino.peer).namesHidden).toBe(true);
    join('Eero');
    expect(hostPlayers(host).map((p) => p.nickname)).toEqual([null, null]);
    expect(JSON.stringify(host.messages.slice(host.messages.indexOf(host.last('game')!)))).not.toMatch(/Aino|Eero/);
    command({ type: 'hide-names', hidden: false });
    expect(hostPlayers(host).map((p) => p.nickname)).toEqual(['Aino', 'Eero']);
  });

  it('ignores host commands from students and unknown players', () => {
    const { session, host, join, command } = setup();
    const aino = join('Aino');
    session.handle(aino.peer, { t: 'host', command: { type: 'kick', playerId: aino.id } });
    expect(aino.peer.last('error')?.code).toBe('not-host');
    command({ type: 'kick', playerId: 'p99' });
    expect(host.last('error')?.code).toBe('unknown-player');
  });
});

describe('rejoin', () => {
  it('by token after a disconnect keeps the player and their used actions', () => {
    const { session, host, join, command } = setup();
    const aino = join('Aino');
    command({ type: 'start' });
    const move = availableMoves(session.game, aino.id)[0]!;
    session.handle(aino.peer, { t: 'act', x: move.x, y: move.y });
    session.disconnect(aino.peer);
    expect(hostPlayers(host)[0]).toMatchObject({ connected: false });
    const again = new FakePeer();
    expect(session.joinPlayer(again, { playerToken: aino.token })).toBeNull();
    const welcome = again.last('welcome')!;
    expect(welcome.you).toMatchObject({ id: aino.id, nickname: 'Aino', actionsLeft: 2, connected: true });
    expect(welcome.playerToken).toBe(aino.token);
    expect(welcome.game.phase).toBe('action');
    expect(hostPlayers(host)[0]).toMatchObject({ connected: true });
  });

  it('by token while still connected replaces the old tab', () => {
    const { session, join } = setup();
    const aino = join('Aino');
    const tab = new FakePeer();
    expect(session.joinPlayer(tab, { playerToken: aino.token })).toBeNull();
    expect(aino.peer.last('error')?.code).toBe('replaced');
    expect(aino.peer.closed).toBe(true);
    session.disconnect(aino.peer);
    expect(session.game.player(aino.id)?.connected).toBe(true);
  });

  it('by nickname only while that player is disconnected', () => {
    const { session, join, refusal } = setup();
    const aino = join('Aino');
    expect(refusal({ nickname: 'Aino' })).toBe('nickname-taken');
    session.disconnect(aino.peer);
    const again = new FakePeer();
    expect(session.joinPlayer(again, { nickname: 'aino' })).toBeNull();
    expect(again.last('welcome')?.you?.id).toBe(aino.id);
    expect(again.last('welcome')?.playerToken).toBe(aino.token);
  });

  it('joining closes when month 4 starts, coming back still works', () => {
    const { clock, session, join, refusal, command } = setup();
    const aino = join('Aino');
    command({ type: 'start' });
    clock.advance(MONTH * 2);
    expect(session.game.month).toBe(3);
    const late = join('Eero');
    expect(session.game.player(late.id)?.countsFromMonth).toBe(4);
    clock.advance(MONTH);
    expect(session.game.month).toBe(4);
    expect(session.status()).toEqual({ exists: true, joinOpen: false, phase: 'action' });
    expect(lastGame(aino.peer).joinOpen).toBe(false);
    expect(refusal({ nickname: 'Siiri' })).toBe('join-closed');
    session.disconnect(aino.peer);
    expect(session.joinPlayer(new FakePeer(), { playerToken: aino.token })).toBeNull();
    session.disconnect(late.peer);
    expect(session.joinPlayer(new FakePeer(), { nickname: 'Eero' })).toBeNull();
  });

  it('after the end: new players are refused, returning ones see the result', () => {
    const { session, join, refusal, command } = setup();
    const aino = join('Aino');
    command({ type: 'start' });
    command({ type: 'end' });
    expect(refusal({ nickname: 'Eero' })).toBe('game-ended');
    session.disconnect(aino.peer);
    const again = new FakePeer();
    expect(session.joinPlayer(again, { playerToken: aino.token })).toBeNull();
    expect(again.last('welcome')?.game.result).toMatchObject({ early: true });
  });

  it('the host gets the named debrief again after a reload at the end', () => {
    const { session, command, join } = setup();
    join('Aino');
    command({ type: 'start' });
    command({ type: 'end' });
    const projector = new FakePeer();
    session.connectHost(projector, HOST);
    expect(projector.last('welcome')).toMatchObject({ role: 'host', you: null });
    expect(projector.last('debrief')?.debrief.players[0]?.label).toBe('Aino');
  });
});

describe('actions, votes and views', () => {
  it('act: result to the actor, a nameless effect and tile patches to everyone else', () => {
    const { session, host, join, command } = setup();
    const aino = join('Aino');
    const eero = join('Eero');
    command({ type: 'start' });
    host.clear();
    eero.peer.clear();
    const move = availableMoves(session.game, aino.id)[0]!;
    session.handle(aino.peer, { t: 'act', x: move.x, y: move.y });
    const result = aino.peer.last('act-result')!;
    expect(result).toMatchObject({ ok: true, x: move.x, y: move.y });
    const gain = result.ok ? result.gain : {};
    expect(eero.peer.last('effect')).toEqual({ t: 'effect', x: move.x, y: move.y, gain });
    expect(host.last('effect')).toEqual({ t: 'effect', x: move.x, y: move.y, gain });
    expect(eero.peer.all('act-result')).toEqual([]);
    expect(aino.peer.all('effect')).toEqual([]);
    expect(aino.peer.last('you')?.you.actionsLeft).toBe(2);
    const patch = host.all('patch');
    expect(patch.some((p) => p.players?.find((x) => x.id === aino.id)?.actionsLeft === 2)).toBe(true);
    expect(eero.peer.all('patch').every((p) => p.players === undefined)).toBe(true);
  });

  it('refuses illegal actions with the engine reason', () => {
    const { session, join, command } = setup();
    const aino = join('Aino');
    session.handle(aino.peer, { t: 'act', x: 0, y: 0 });
    expect(aino.peer.last('act-result')).toMatchObject({ ok: false, reason: 'wrong-phase' });
    command({ type: 'start' });
    session.handle(aino.peer, { t: 'act', x: 999, y: 0 });
    expect(aino.peer.last('act-result')).toMatchObject({ ok: false, reason: 'out-of-bounds' });
  });

  it('inspect answers with a preview', () => {
    const { session, join, command } = setup();
    const aino = join('Aino');
    command({ type: 'start' });
    const move = availableMoves(session.game, aino.id)[0]!;
    session.handle(aino.peer, { t: 'inspect', x: move.x, y: move.y });
    expect(aino.peer.last('preview')).toEqual({ t: 'preview', x: move.x, y: move.y, preview: move.preview });
  });

  it('vote: result to the voter, live counts to everyone, own vote in the view', () => {
    const { clock, session, host, join, command } = setup();
    const aino = join('Aino');
    const eero = join('Eero');
    command({ type: 'start' });
    session.handle(aino.peer, { t: 'vote', option: 'none' });
    expect(aino.peer.last('vote-result')).toEqual({ t: 'vote-result', ok: false, reason: 'wrong-phase' });
    clock.advance(ACTION);
    session.handle(aino.peer, { t: 'vote', option: 'nope' });
    expect(aino.peer.last('vote-result')).toEqual({ t: 'vote-result', ok: false, reason: 'unknown-option' });
    session.handle(aino.peer, { t: 'vote', option: 'none' });
    expect(aino.peer.last('vote-result')).toEqual({ t: 'vote-result', ok: true });
    expect(aino.peer.last('you')?.you.vote).toBe('none');
    expect(eero.peer.last('patch')?.vote).toMatchObject({ votesCast: 1, counts: { none: 1 } });
    expect(hostPlayers(host).find((p) => p.id === aino.id)?.voted).toBe(true);
  });

  it('announces a finished building on the ticker', () => {
    const { clock, session, host, join, command } = setup({ params: { ...DEFAULT_PARAMS, startWoodPerVillager: 50 } });
    const aino = join('Aino');
    command({ type: 'start' });
    clock.advance(ACTION);
    const shelter = session.game.voteOptions().find((o) => o.id === 'shelter-1')!;
    expect(shelter.blocked).toEqual([]);
    session.handle(aino.peer, { t: 'vote', option: 'shelter-1' });
    clock.advance(3_000);
    expect(session.game.phase).toBe('summary');
    const built = host.all('ticker').find((t) => t.event.kind === 'built');
    expect(built?.event).toMatchObject({ kind: 'built', option: 'shelter-1' });
    expect(lastGame(host).lastReport?.vote.outcome).toBe('built');
  });

  it('students never see other nicknames or fogged terrain', () => {
    const { clock, session, join, command, useAllActions } = setup();
    const aino = join('Aino');
    const eero = join('Eero');
    const siiri = join('Siiri');
    command({ type: 'start' });
    for (let month = 0; month < 3; month++) {
      useAllActions(aino, eero, siiri);
      for (const p of [aino, eero, siiri]) session.handle(p.peer, { t: 'vote', option: 'none' });
      clock.advance(3_000 + SUMMARY);
    }
    const text = JSON.stringify(aino.peer.messages);
    expect(text).toContain('Aino');
    expect(text).not.toMatch(/Eero|Siiri/);

    const tiles: PublicTile[] = [];
    for (const m of aino.peer.messages as ServerMessage[]) {
      if ((m.t === 'game' || m.t === 'welcome') && m.game.map) tiles.push(...m.game.map.tiles);
      if (m.t === 'patch' && m.tiles) tiles.push(...m.tiles);
      if (m.t === 'welcome' || m.t === 'game') expect(m.game.players).toEqual([]);
    }
    const fogged = tiles.filter((t) => t.fog);
    expect(fogged.length).toBeGreaterThan(0);
    for (const t of fogged) {
      expect(t).toMatchObject({ terrain: null, building: null, stock: null, work: null, uses: null });
    }
  });

  it('patches only the tiles that changed', () => {
    const { session, host, join, command } = setup();
    const aino = join('Aino');
    command({ type: 'start' });
    host.clear();
    const move = availableMoves(session.game, aino.id).find((m) => m.preview.kind === 'explore')!;
    session.handle(aino.peer, { t: 'act', x: move.x, y: move.y });
    const tiles = host.all('patch').flatMap((p) => p.tiles ?? []);
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.length).toBeLessThan(10);
    expect(tiles.some((t) => t.x === move.x && t.y === move.y)).toBe(true);
  });
});

describe('trial mode', () => {
  it('adds about 20 bots that play by themselves; never stored', () => {
    const { clock, session, host, command, saved } = setup({ trial: true });
    const players = hostPlayers(host);
    expect(players).toHaveLength(20);
    expect(players.every((p) => p.connected && p.nickname !== null)).toBe(true);
    expect(lastGame(host).trial).toBe(true);
    command({ type: 'start' });
    clock.advance(900);
    expect(host.all('effect')).toHaveLength(0);
    clock.advance(3_000);
    expect(host.all('effect').length).toBeGreaterThan(0);
    // Bots act gradually: the action phase lasts several seconds but ends before the timer.
    const ended = clock.runUntil(() => session.game.phase !== 'action', ACTION);
    expect(ended).toBe(true);
    expect(session.game.phase).toBe('vote');
    expect(clock.runUntil(() => session.game.phase === 'ended', MONTH * 10)).toBe(true);
    expect(saved).toHaveLength(0);
    expect(host.last('debrief')).toMatchObject({ storedToken: null });
    expect(host.last('debrief')?.debrief.players).toHaveLength(20);
  });

  it('bots stop while the game is paused', () => {
    const { clock, host, command } = setup({ trial: true });
    command({ type: 'start' });
    command({ type: 'pause' });
    clock.advance(20_000);
    expect(host.all('effect')).toHaveLength(0);
    command({ type: 'resume' });
    clock.advance(5_000);
    expect(host.all('effect').length).toBeGreaterThan(0);
  });

  it('a person can play next to the bots', () => {
    const { session, join } = setup({ trial: true });
    const teacher = join('Opettaja');
    expect(session.playerCount).toBe(21);
    expect(teacher.peer.last('welcome')?.game.trial).toBe(true);
  });
});
