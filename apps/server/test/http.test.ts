import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { realScheduler } from '../src/clock.ts';
import { createHttpHandler, type HttpOptions } from '../src/http.ts';
import { Hub } from '../src/hub.ts';
import { DebriefStore } from '../src/store.ts';
import { fakeDebrief, fakeDebriefing, fakeNaming } from './fixtures.ts';

let dir: string;
let store: DebriefStore;
let hub: Hub;
let server: http.Server;
let base: string;

async function start(over: Partial<HttpOptions> = {}, hubOver: { maxGames?: number } = {}) {
  hub = new Hub({ scheduler: realScheduler, store, naming: fakeNaming, debriefing: fakeDebriefing, log: () => {}, ...hubOver });
  server = http.createServer(createHttpHandler({ hub, store, staticDir: null, ...over }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saari-http-'));
  store = new DebriefStore(path.join(dir, 'data'));
});

afterEach(async () => {
  hub?.dispose();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  store.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const post = (body: string, headers: Record<string, string> = {}) =>
  fetch(`${base}/api/games`, { method: 'POST', body, headers: { 'content-type': 'application/json', ...headers } });

/** Raw request so the path is not normalised by the client. */
function rawGet(pathname: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request({ host: url.hostname, port: url.port, path: pathname, method: 'GET' }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c: string) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('POST /api/games', () => {
  it('creates a game', async () => {
    await start();
    const res = await post(JSON.stringify({ length: 'short', actionSeconds: 45 }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { code: string; hostToken: string };
    expect(body.code).toMatch(/^[1-9]\d{5}$/);
    expect(body.hostToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(hub.session(body.code)?.actionSeconds).toBe(45);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('rejects bad bodies', async () => {
    await start();
    expect((await post('not json')).status).toBe(400);
    expect((await post(JSON.stringify({ length: 'forever' }))).status).toBe(400);
    expect((await post(JSON.stringify({ length: 'short', pad: 'x'.repeat(5000) }))).status).toBe(413);
    expect(hub.size).toBe(0);
  });

  it('refuses an oversized chunked body without a Content-Length', async () => {
    await start();
    const url = new URL(base);
    const status = await new Promise<number>((resolve, reject) => {
      const req = http.request(
        { host: url.hostname, port: url.port, path: '/api/games', method: 'POST', headers: { 'transfer-encoding': 'chunked' } },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        },
      );
      req.on('error', reject);
      req.write('{"length":"short","pad":"');
      req.write('x'.repeat(5000));
      req.end('"}');
    });
    expect(status).toBe(413);
    expect(hub.size).toBe(0);
  });

  it('limits game creation per address', async () => {
    await start({ createLimit: { max: 2, windowMs: 60_000 } });
    const body = JSON.stringify({ length: 'short' });
    expect((await post(body)).status).toBe(201);
    expect((await post(body)).status).toBe(201);
    expect((await post(body)).status).toBe(429);
  });

  it('uses the forwarded address only when told to trust the proxy', async () => {
    await start({ createLimit: { max: 1, windowMs: 60_000 }, trustProxy: true });
    const body = JSON.stringify({ length: 'short' });
    expect((await post(body, { 'x-forwarded-for': '10.0.0.1' })).status).toBe(201);
    expect((await post(body, { 'x-forwarded-for': '10.0.0.2' })).status).toBe(201);
    expect((await post(body, { 'x-forwarded-for': '10.0.0.1' })).status).toBe(429);
  });

  it('answers 503 when the server holds too many games', async () => {
    await start({}, { maxGames: 1 });
    const body = JSON.stringify({ length: 'short' });
    expect((await post(body)).status).toBe(201);
    expect((await post(body)).status).toBe(503);
  });
});

describe('GET /api/games/:code', () => {
  it('tells the join page whether the game exists and is open', async () => {
    await start();
    const { code } = hub.createGame({ length: 'short', actionSeconds: 60, trial: false });
    expect(await (await fetch(`${base}/api/games/${code}`)).json()).toEqual({ exists: true, joinOpen: true, phase: 'lobby' });
    expect(await (await fetch(`${base}/api/games/000001`)).json()).toEqual({ exists: false, joinOpen: false, phase: null });
    expect(await (await fetch(`${base}/api/games/abc`)).json()).toEqual({ exists: false, joinOpen: false, phase: null });
  });

  it('limits wrong codes per address', async () => {
    await start({ missLimit: { max: 3, windowMs: 60_000 } });
    for (let i = 0; i < 3; i++) expect((await fetch(`${base}/api/games/11111${i}`)).status).toBe(200);
    expect((await fetch(`${base}/api/games/111119`)).status).toBe(429);
  });
});

describe('debriefs', () => {
  it('serves, deletes and forgets a stored debrief', async () => {
    await start();
    const stored = fakeDebrief([{ id: 'p1', label: 'Pelaaja 1', color: '#123456' }], false);
    const token = store.save(stored);
    const res = await fetch(`${base}/api/debriefs/${token}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(stored);
    expect((await fetch(`${base}/api/debriefs/${token}`, { method: 'DELETE' })).status).toBe(204);
    expect((await fetch(`${base}/api/debriefs/${token}`)).status).toBe(404);
    expect((await fetch(`${base}/api/debriefs/${token}`, { method: 'DELETE' })).status).toBe(404);
    expect((await fetch(`${base}/api/debriefs/not%20a%20token`)).status).toBe(404);
  });
});

describe('misc', () => {
  it('has a health check', async () => {
    await start();
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it('404 for unknown API routes, 405 for wrong methods, 404 without a client', async () => {
    await start();
    expect((await fetch(`${base}/api/nope`)).status).toBe(404);
    expect((await fetch(`${base}/api/games`, { method: 'GET' })).status).toBe(405);
    expect((await fetch(`${base}/healthz`, { method: 'POST' })).status).toBe(405);
    expect((await fetch(`${base}/`)).status).toBe(404);
  });
});

describe('static client', () => {
  it('serves files and falls back to index.html for app routes', async () => {
    const web = path.join(dir, 'web');
    fs.mkdirSync(path.join(web, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(web, 'index.html'), '<!doctype html><title>saari</title>');
    fs.writeFileSync(path.join(web, 'assets', 'app-1234.js'), 'console.log(1)');
    fs.writeFileSync(path.join(dir, 'secret.txt'), 'top secret');
    await start({ staticDir: web });

    const index = await fetch(`${base}/`);
    expect(index.status).toBe(200);
    expect(index.headers.get('content-type')).toMatch(/^text\/html/);
    expect(await index.text()).toContain('<title>saari</title>');

    const js = await fetch(`${base}/assets/app-1234.js`);
    expect(js.headers.get('content-type')).toMatch(/^text\/javascript/);
    expect(js.headers.get('cache-control')).toMatch(/immutable/);
    expect(await js.text()).toBe('console.log(1)');

    const route = await fetch(`${base}/join/123456`);
    expect(route.status).toBe(200);
    expect(await route.text()).toContain('<title>saari</title>');

    expect((await fetch(`${base}/missing.png`)).status).toBe(404);
    const traversal = await rawGet('/..%2fsecret.txt');
    expect(traversal.body).not.toContain('top secret');
    const traversal2 = await rawGet('/../secret.txt');
    expect(traversal2.body).not.toContain('top secret');
    // The API still answers next to the client.
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
  });
});
