import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PROTOCOL_VERSION, type ServerMessage } from '@saari/protocol';
import WebSocket from 'ws';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startServer, type RunningServer } from '../src/server.ts';
import { fakeDebriefing, fakeNaming } from './fixtures.ts';
import { Client } from './ws-client.ts';

let dir: string;
let server: RunningServer;
let url: string;

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saari-ws-'));
  server = await startServer(
    { port: 0, dataDir: dir, staticDir: null, timeScale: 1, trustProxy: false },
    { log: () => {}, heartbeatMs: 100, naming: fakeNaming, debriefing: fakeDebriefing },
  );
  url = `ws://127.0.0.1:${server.port}/ws`;
});

afterEach(async () => {
  await server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

async function hostAndPlayer() {
  const { code, hostToken } = server.hub.createGame({ length: 'short', actionSeconds: 60, trial: false });
  const host = await Client.open(url);
  host.send({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
  await host.waitFor((m) => m.t === 'welcome');
  const player = await Client.open(url);
  player.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: 'Aino' });
  await player.waitFor((m) => m.t === 'welcome');
  return { code, host, player };
}

const lastPlayers = (client: Client) => {
  for (let i = client.messages.length - 1; i >= 0; i--) {
    const m = client.messages[i]!;
    if (m.t === 'patch' && m.players) return m.players;
  }
  return [];
};

describe('WebSocket endpoint', () => {
  it('speaks the protocol on /ws only', async () => {
    const wrong = new WebSocket(`ws://127.0.0.1:${server.port}/other`);
    const failed = await new Promise<boolean>((resolve) => {
      wrong.on('open', () => resolve(false));
      wrong.on('error', () => resolve(true));
    });
    expect(failed).toBe(true);

    const client = await Client.open(url);
    client.send({ t: 'ping' });
    const pong = await client.waitFor<Extract<ServerMessage, { t: 'pong' }>>((m) => m.t === 'pong');
    expect(Math.abs(pong.serverTime - Date.now())).toBeLessThan(5_000);
    client.ws.send('not json');
    expect(await client.waitFor((m) => m.t === 'error')).toEqual({ t: 'error', code: 'bad-message' });
    client.close();
  });

  it('closes a connection that sends an oversized frame', async () => {
    const client = await Client.open(url);
    client.ws.send(JSON.stringify({ t: 'ping', pad: 'x'.repeat(10_000) }));
    expect((await client.closed()).code).toBe(1009);
  });

  it('drops dead sockets with heartbeats and marks the player disconnected', async () => {
    const { host, player } = await hostAndPlayer();
    // Stop reading: the client no longer answers pings.
    (player.ws as unknown as { _socket: { pause(): void } })._socket.pause();
    await host.waitFor((m) => m.t === 'patch' && m.players?.[0]?.connected === false, 3_000);
    expect(lastPlayers(host)[0]).toMatchObject({ nickname: 'Aino', connected: false });
  });

  it('a closed tab is disconnected at once and can come back with its token', async () => {
    const { code, host, player } = await hostAndPlayer();
    const welcome = player.messages.find((m) => m.t === 'welcome')!;
    const token = welcome.t === 'welcome' ? welcome.playerToken! : '';
    player.close();
    await host.waitFor((m) => m.t === 'patch' && m.players?.[0]?.connected === false);
    const from = host.messages.length;
    const again = await Client.open(url);
    again.send({ t: 'hello-player', protocol: PROTOCOL_VERSION, code, playerToken: token });
    const back = await again.waitFor<Extract<ServerMessage, { t: 'welcome' }>>((m) => m.t === 'welcome');
    expect(back.you?.nickname).toBe('Aino');
    await host.waitFor((m) => m.t === 'patch' && m.players?.[0]?.connected === true, 5_000, from);
  });

  it('drops floods instead of processing them', async () => {
    const client = await Client.open(url);
    for (let i = 0; i < 200; i++) client.send({ t: 'ping' });
    await new Promise((r) => setTimeout(r, 300));
    const pongs = client.messages.filter((m) => m.t === 'pong').length;
    expect(pongs).toBeGreaterThanOrEqual(40);
    expect(pongs).toBeLessThan(200);
  });
});
