import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createBot } from '@saari/bots';
import type { DebriefData } from '@saari/debrief';
import { PROTOCOL_VERSION, type GameView, type ServerMessage } from '@saari/protocol';
import { createRng, type Rng } from '@saari/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, type RunningServer } from '../src/server.ts';
import { Client } from './ws-client.ts';

/**
 * V4 definition of done: 30 bots play a whole game over real WebSockets.
 *
 * Each bot client is a real WebSocket that only reacts to what it receives (phase
 * changes, its own act results). To pick a tile it asks the cooperative bot from
 * @saari/bots, which needs a rules `Game`: the views a client gets cannot rebuild one
 * (fogged tiles carry no terrain), so the bot reads the live server-side Game of this
 * in-process server, read-only. Every move and vote still travels over the socket and
 * goes through the server's validation.
 */

const NICKNAMES = [
  'Aino Kallio', 'Eero Mäki', 'Siiri Laine', 'Onni Koski', 'Helmi Rinne', 'Veeti Salo',
  'Lumi Aalto', 'Niilo Heino', 'Venla Lehto', 'Kerttu Vaara', 'Eemil Niemi', 'Ilona Harju',
  'Aatos Saari', 'Lilja Mattila', 'Toivo Kivi', 'Selma Ranta', 'Väinö Lahti', 'Iida Peltola',
  'Oiva Hakala', 'Hilla Nurmi', 'Pihla Aho', 'Elias Rautio', 'Kaapo Lind', 'Minea Joki',
  'Arvo Kangas', 'Saimi Vuori', 'Lenni Haapala', 'Sohvi Karhu', 'Into Paju', 'Nelli Kumpu',
];

let dir: string;
let server: RunningServer;
let base: string;
let wsUrl: string;
const logs: string[] = [];

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saari-int-'));
  server = await startServer(
    { port: 0, dataDir: dir, staticDir: null, timeScale: 50, trustProxy: false },
    { log: (line) => logs.push(line), heartbeatMs: 60_000 },
  );
  base = `http://127.0.0.1:${server.port}`;
  wsUrl = `ws://127.0.0.1:${server.port}/ws`;
});

afterAll(async () => {
  await server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Plays one seat: acts while the view says action phase, votes once per vote phase. */
function playAsBot(client: Client, code: string, rng: Rng): void {
  const bot = createBot('cooperative');
  const engine = () => server.hub.session(code)!.game;
  let id = '';
  let view: GameView | null = null;
  let pending = false;
  let failures = 0;
  let votedMonth = 0;

  const step = () => {
    if (!view || view.timer.paused) return;
    if (view.phase === 'action' && !pending && failures < 20) {
      const move = bot.chooseAction(engine(), id, rng);
      if (move) {
        pending = true;
        client.send({ t: 'act', x: move.x, y: move.y });
      }
    } else if (view.phase === 'vote' && votedMonth !== view.month) {
      votedMonth = view.month;
      const option = bot.chooseVote(engine(), id, rng);
      if (option !== null) client.send({ t: 'vote', option });
    }
  };

  client.onMessage = (m: ServerMessage) => {
    switch (m.t) {
      case 'welcome':
        id = m.you!.id;
        view = m.game;
        return;
      case 'game':
        view = m.game;
        pending = false;
        failures = 0;
        step();
        return;
      case 'act-result':
        pending = false;
        if (!m.ok) failures += 1;
        step();
        return;
      default:
        return;
    }
  };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('a whole game over WebSockets', () => {
  it('30 cooperative bots play a short game to the end; the host gets the debrief', async () => {
    const created = await fetch(`${base}/api/games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ length: 'short' }),
    });
    expect(created.status).toBe(201);
    const { code, hostToken } = (await created.json()) as { code: string; hostToken: string };

    const host = await Client.open(wsUrl);
    host.send({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
    await host.waitFor((m) => m.t === 'welcome');

    const players = await Promise.all(
      NICKNAMES.map(async (nickname, i) => {
        const client = await Client.open(wsUrl);
        playAsBot(client, code, createRng(1000 + i));
        client.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname });
        const answer = await client.waitFor((m) => m.t === 'welcome' || m.t === 'refused-join');
        expect(answer).toMatchObject({ t: 'welcome', role: 'player', you: { nickname } });
        return client;
      }),
    );
    expect(server.hub.session(code)!.playerCount).toBe(30);

    host.send({ t: 'host', command: { type: 'start' } });
    const debrief = await host.waitFor<Extract<ServerMessage, { t: 'debrief' }>>((m) => m.t === 'debrief', 90_000);

    // Every client saw the end result.
    const hostEnd = await host.waitFor<Extract<ServerMessage, { t: 'game' }>>((m) => m.t === 'game' && m.game.phase === 'ended');
    const result = hostEnd.game.result!;
    expect(result.early).toBe(false);
    expect(result.grade).toBeGreaterThanOrEqual(1);
    for (const client of players) {
      const end = await client.waitFor<Extract<ServerMessage, { t: 'game' }>>(
        (m) => m.t === 'game' && m.game.phase === 'ended',
        10_000,
      );
      expect(end.game.result).toEqual(result);
      expect(end.game.month).toBe(10);
    }

    // The game was really played: lots of actions and ten month reports.
    const game = server.hub.session(code)!.game;
    expect(game.reports).toHaveLength(10);
    expect(game.log.filter((e) => e.type === 'action').length).toBeGreaterThan(300);
    expect(game.log.filter((e) => e.type === 'vote').length).toBeGreaterThan(100);

    // The host has the named debrief; the stored copy is pseudonymised.
    expect(debrief.debrief.named).toBe(true);
    expect(debrief.debrief.players.map((p) => p.label).sort()).toEqual([...NICKNAMES].sort());
    expect(debrief.storedToken).toEqual(expect.any(String));
    const stored = await fetch(`${base}/api/debriefs/${debrief.storedToken}`);
    expect(stored.status).toBe(200);
    const storedText = await stored.text();
    expect((JSON.parse(storedText) as DebriefData).named).toBe(false);
    for (const nickname of NICKNAMES) expect(storedText).not.toContain(nickname);

    // Students never got anyone else's nickname (P34).
    const anyName = new RegExp(NICKNAMES.map(escape).join('|'), 'g');
    players.forEach((client, i) => {
      const seen = new Set(client.frames.join('\n').match(anyName) ?? []);
      expect([...seen]).toEqual([NICKNAMES[i]]);
    });

    // No nickname reached the server log.
    for (const nickname of NICKNAMES) expect(logs.join('\n')).not.toContain(nickname);
    expect(logs.some((l) => l.includes(`game ${code} started, 30 players`))).toBe(true);
    expect(logs.some((l) => l.startsWith(`game ${code} ended`))).toBe(true);

    for (const client of [host, ...players]) client.close();
  }, 120_000);

  it('trial mode: 20 bots play by themselves on the projector and nothing is stored', async () => {
    const before = server.store.count();
    const created = await fetch(`${base}/api/games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ length: 'short', actionSeconds: 45, trial: true }),
    });
    const { code, hostToken } = (await created.json()) as { code: string; hostToken: string };
    const host = await Client.open(wsUrl);
    host.send({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
    const welcome = await host.waitFor<Extract<ServerMessage, { t: 'welcome' }>>((m) => m.t === 'welcome');
    expect(welcome.game.trial).toBe(true);
    expect(welcome.game.players).toHaveLength(20);
    expect(welcome.game.players.every((p) => typeof p.nickname === 'string' && p.nickname.length > 0)).toBe(true);

    host.send({ t: 'host', command: { type: 'start' } });
    await host.waitFor((m) => m.t === 'effect', 5_000);
    const debrief = await host.waitFor<Extract<ServerMessage, { t: 'debrief' }>>((m) => m.t === 'debrief', 90_000);
    expect(debrief.storedToken).toBeNull();
    expect(debrief.debrief.players).toHaveLength(20);
    expect(server.store.count()).toBe(before);
    host.close();
  }, 120_000);

  it('privacy (MVP DoD): no nickname anywhere in the data directory after the game', () => {
    const files = fs.readdirSync(dir);
    expect(files).toContain('saari.db');
    expect(server.store.count()).toBe(1);
    for (const file of files) {
      const bytes = fs.readFileSync(path.join(dir, file));
      for (const nickname of NICKNAMES) {
        for (const form of [nickname, nickname.toLowerCase(), nickname.toUpperCase()]) {
          expect(bytes.includes(Buffer.from(form, 'utf8'))).toBe(false);
          expect(bytes.includes(Buffer.from(form, 'utf16le'))).toBe(false);
        }
      }
    }
  });
});
