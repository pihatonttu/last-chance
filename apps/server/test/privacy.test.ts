import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createBot } from '@saari/bots';
import { createRng } from '@saari/rules';
import { afterEach, describe, expect, it } from 'vitest';
import { GameSession, timingFor } from '../src/session.ts';
import { DebriefStore } from '../src/store.ts';
import { FakeScheduler } from './fake-clock.ts';
import { FakePeer } from './fixtures.ts';

const NICKNAMES = ['Ainomaija Kuusi', 'Eerikki Palomaa', 'Siirisofia Ruuth', 'Onnipekka Valve', 'Helmiina Tarvas'];

let dir: string;
let store: DebriefStore | undefined;

afterEach(() => {
  store?.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

/**
 * MVP definition of done (docs/02-suunnitelma.md §11): after a game the database holds
 * no nickname. Uses the real @saari/names, @saari/debrief and SQLite store.
 */
describe('privacy', () => {
  it('a finished game leaves no nickname in the raw database file', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saari-privacy-'));
    store = new DebriefStore(dir);
    const clock = new FakeScheduler();
    const session = new GameSession({
      code: '424242',
      hostToken: 'host',
      length: 'short',
      actionSeconds: 60,
      trial: false,
      scheduler: clock,
      timing: timingFor(60),
      seed: 99,
      store,
      log: () => {},
    });
    const host = new FakePeer();
    session.connectHost(host, 'host');
    const players = NICKNAMES.map((nickname) => {
      const peer = new FakePeer();
      expect(session.joinPlayer(peer, { nickname })).toBeNull();
      return { peer, id: peer.last('welcome')!.you!.id };
    });
    // The teacher renames one player: both names must stay off the disk.
    session.handle(host, { t: 'host', command: { type: 'rename', playerId: players[4]!.id } });
    const renamed = host.messages.flatMap((m) => (m.t === 'patch' ? (m.players ?? []) : [])).at(-1)!.nickname!;
    expect(renamed).not.toBe(NICKNAMES[4]);

    session.handle(host, { t: 'host', command: { type: 'start' } });
    const bot = createBot('cooperative');
    const rng = createRng(5);
    for (let guard = 0; guard < 500 && session.game.phase !== 'ended'; guard++) {
      const game = session.game;
      if (game.phase === 'action') {
        for (const p of players) {
          const move = bot.chooseAction(game, p.id, rng);
          if (move) session.handle(p.peer, { t: 'act', x: move.x, y: move.y });
        }
      } else if (game.phase === 'vote') {
        for (const p of players) session.handle(p.peer, { t: 'vote', option: bot.chooseVote(game, p.id, rng) ?? 'none' });
      }
      clock.advance(1_000);
    }
    expect(session.game.phase).toBe('ended');

    const debrief = host.last('debrief')!;
    expect(debrief.debrief.named).toBe(true);
    expect(debrief.debrief.players.map((p) => p.label)).toContain(NICKNAMES[0]);
    expect(debrief.storedToken).toEqual(expect.any(String));
    expect(store.get(debrief.storedToken!)?.named).toBe(false);
    store.close();

    const names = [...NICKNAMES, renamed];
    for (const file of fs.readdirSync(dir)) {
      const bytes = fs.readFileSync(path.join(dir, file));
      for (const name of names) {
        for (const form of [name, name.toLowerCase(), name.toUpperCase()]) {
          expect(bytes.includes(Buffer.from(form, 'utf8')), `${form} in ${file}`).toBe(false);
          expect(bytes.includes(Buffer.from(form, 'utf16le')), `${form} in ${file}`).toBe(false);
        }
      }
    }
  });
});
