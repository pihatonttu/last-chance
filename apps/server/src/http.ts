import { createHmac, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { DebriefData } from '@saari/debrief';
import { HubFullError, type Hub } from './hub.ts';
import { parseCreateGameRequest } from './validate.ts';

/** Request bodies are tiny; anything bigger is refused. */
export const MAX_BODY_BYTES = 4096;

export interface Limit {
  max: number;
  windowMs: number;
}

/** Game creation per address: generous, because a whole school shares one address. */
export const CREATE_LIMIT: Limit = { max: 30, windowMs: 10 * 60 * 1000 };
/** Status lookups of codes that do not exist, per address (join code guessing). */
export const MISS_LIMIT: Limit = { max: 100, windowMs: 10 * 60 * 1000 };

export interface DebriefReader {
  get(token: string): DebriefData | null;
  delete(token: string): boolean;
}

export interface HttpOptions {
  hub: Hub;
  store: DebriefReader;
  /** Built client; null = API only. */
  staticDir: string | null;
  /** Take the client address from the last X-Forwarded-For hop (behind Traefik). */
  trustProxy?: boolean;
  createLimit?: Limit;
  missLimit?: Limit;
  log?: (line: string) => void;
}

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  // Debrief links carry a secret token: never leak it in a Referer.
  'referrer-policy': 'no-referrer',
} as const;

const CODE = /^\d{6}$/;
const TOKEN = /^[A-Za-z0-9_-]{16,128}$/;

/**
 * In-memory fixed-window counter. Keys are keyed hashes of addresses, so not even
 * memory holds a plain IP; nothing is logged or stored.
 */
class RateLimiter {
  readonly #limit: Limit;
  readonly #hits = new Map<string, { count: number; resetAt: number }>();

  constructor(limit: Limit) {
    this.#limit = limit;
  }

  allow(key: string, now = Date.now()): boolean {
    if (this.#hits.size > 10_000) this.#prune(now);
    let entry = this.#hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + this.#limit.windowMs };
      this.#hits.set(key, entry);
    }
    entry.count += 1;
    return entry.count <= this.#limit.max;
  }

  #prune(now: number): void {
    for (const [key, entry] of this.#hits) if (entry.resetAt <= now) this.#hits.delete(key);
  }
}

export function createHttpHandler(options: HttpOptions): (req: IncomingMessage, res: ServerResponse) => void {
  const { hub, store } = options;
  const log = options.log ?? ((line: string) => console.log(line));
  const createLimiter = new RateLimiter(options.createLimit ?? CREATE_LIMIT);
  const missLimiter = new RateLimiter(options.missLimit ?? MISS_LIMIT);
  const salt = randomBytes(32);
  const who = (req: IncomingMessage) =>
    createHmac('sha256', salt).update(clientAddress(req, options.trustProxy ?? false)).digest('base64url');
  const files = options.staticDir ? new StaticFiles(options.staticDir) : null;

  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const pathname = url.pathname;
    const method = req.method ?? 'GET';

    if (pathname === '/healthz') {
      if (method !== 'GET' && method !== 'HEAD') return notAllowed(res, 'GET, HEAD');
      return json(res, 200, { ok: true, games: hub.size });
    }

    if (pathname === '/api/games') {
      if (method !== 'POST') return notAllowed(res, 'POST');
      if (!createLimiter.allow(who(req))) return json(res, 429, { error: 'too-many-requests' });
      const body = await readBody(req, res);
      if (body === null) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        return json(res, 400, { error: 'bad-json' });
      }
      const settings = parseCreateGameRequest(parsed);
      if (!settings) return json(res, 400, { error: 'bad-request' });
      try {
        return json(res, 201, hub.createGame(settings));
      } catch (error) {
        if (error instanceof HubFullError) return json(res, 503, { error: 'server-full' });
        throw error;
      }
    }

    const game = /^\/api\/games\/([^/]+)$/.exec(pathname);
    if (game) {
      if (method !== 'GET') return notAllowed(res, 'GET');
      const code = game[1]!;
      const status = CODE.test(code) ? hub.status(code) : { exists: false, joinOpen: false, phase: null };
      if (!status.exists && !missLimiter.allow(who(req))) return json(res, 429, { error: 'too-many-requests' });
      return json(res, 200, status);
    }

    const debrief = /^\/api\/debriefs\/([^/]+)$/.exec(pathname);
    if (debrief) {
      const token = debrief[1]!;
      if (method === 'GET') {
        const data = TOKEN.test(token) ? store.get(token) : null;
        return data ? json(res, 200, data) : json(res, 404, { error: 'not-found' });
      }
      if (method === 'DELETE') {
        if (TOKEN.test(token) && store.delete(token)) {
          res.writeHead(204, { ...SECURITY_HEADERS, 'cache-control': 'no-store' });
          res.end();
          return;
        }
        return json(res, 404, { error: 'not-found' });
      }
      return notAllowed(res, 'GET, DELETE');
    }

    if (pathname === '/api' || pathname.startsWith('/api/')) return json(res, 404, { error: 'not-found' });
    if (files && (method === 'GET' || method === 'HEAD')) return files.serve(req, res, pathname);
    return json(res, 404, { error: 'not-found' });
  }

  return (req, res) => {
    route(req, res).catch((error: unknown) => {
      log(`http error: ${error instanceof Error ? error.message : String(error)}`);
      if (!res.headersSent) json(res, 500, { error: 'server-error' });
      else res.destroy();
    });
  };
}

function clientAddress(req: IncomingMessage, trustProxy: boolean): string {
  if (trustProxy) {
    const header = req.headers['x-forwarded-for'];
    const value = Array.isArray(header) ? header.join(',') : header;
    // The proxy appends the address it saw: the last hop is the one to trust.
    const last = value
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .at(-1);
    if (last) return last;
  }
  return req.socket.remoteAddress ?? '';
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
  });
  res.end(text);
}

function notAllowed(res: ServerResponse, allow: string): void {
  res.setHeader('allow', allow);
  json(res, 405, { error: 'method-not-allowed' });
}

/** Reads a body of at most MAX_BODY_BYTES; answers 413 itself and returns null when larger. */
function readBody(req: IncomingMessage, res: ServerResponse): Promise<string | null> {
  const tooLarge = () => {
    res.setHeader('connection', 'close');
    res.on('finish', () => req.destroy());
    json(res, 413, { error: 'too-large' });
  };
  if (Number(req.headers['content-length'] ?? 0) > MAX_BODY_BYTES) {
    tooLarge();
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    req.on('data', (chunk: Buffer) => {
      if (done) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        done = true;
        req.pause();
        tooLarge();
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', (error) => {
      if (done) return;
      done = true;
      reject(error);
    });
  });
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
};

/** The built client with SPA fallback: paths without a file extension get index.html. */
class StaticFiles {
  readonly #root: string;

  constructor(root: string) {
    this.#root = path.resolve(root);
  }

  async serve(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
    let relative: string;
    try {
      relative = decodeURIComponent(pathname);
    } catch {
      return json(res, 400, { error: 'bad-path' });
    }
    const file = path.resolve(this.#root, `.${relative}`);
    const inside = file === this.#root || file.startsWith(this.#root + path.sep);
    if (!inside || relative.includes('\0')) return json(res, 404, { error: 'not-found' });

    const found = await statFile(file);
    if (found) return this.#send(req, res, file, found, relative);
    if (path.extname(relative) === '' || relative.endsWith('/')) {
      const index = path.join(this.#root, 'index.html');
      const indexStat = await statFile(index);
      if (indexStat) return this.#send(req, res, index, indexStat, '/index.html');
    }
    return json(res, 404, { error: 'not-found' });
  }

  #send(req: IncomingMessage, res: ServerResponse, file: string, stat: fs.Stats, relative: string): void {
    const type = CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    const cache = relative.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : file.endsWith('index.html')
        ? 'no-cache'
        : 'public, max-age=3600';
    res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': type, 'content-length': stat.size, 'cache-control': cache });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = fs.createReadStream(file);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  }
}

/** The stat of a regular file, or null (missing, directory...). */
async function statFile(file: string): Promise<fs.Stats | null> {
  try {
    const stat = await fs.promises.stat(file);
    return stat.isFile() ? stat : null;
  } catch {
    return null;
  }
}
