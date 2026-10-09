/** HTTP side of the protocol (packages/protocol). Same origin; Vite proxies /api in development. */
import type { DebriefData } from '@saari/debrief';
import type { CreateGameRequest, CreateGameResponse, GameStatusResponse, StoredDebriefResponse } from '@saari/protocol';
import { isMock } from './mode.ts';

/** The mock lives in its own chunk; production pages never load it. */
async function mock() {
  return (await import('./mock/hub.ts')).mockApi;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? { accept: 'application/json' } : { accept: 'application/json', 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new ApiError(response.status, `${method} ${path} → ${response.status}`);
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : null;
}

export async function createGame(req: CreateGameRequest): Promise<CreateGameResponse> {
  if (isMock()) return (await mock()).createGame(req);
  const created = await request<CreateGameResponse>('POST', '/api/games', req);
  if (!created) throw new ApiError(404, 'POST /api/games → 404');
  return created;
}

/** null when the code does not exist. */
export async function gameStatus(code: string): Promise<GameStatusResponse | null> {
  if (isMock()) return (await mock()).status(code);
  const status = await request<GameStatusResponse>('GET', `/api/games/${encodeURIComponent(code)}`);
  return status && status.exists ? status : null;
}

/** null when the debrief is gone (deleted or older than 30 days). */
export async function fetchDebrief(token: string): Promise<DebriefData | null> {
  if (isMock()) return (await (await mock()).debrief(token, false)).debrief;
  return request<StoredDebriefResponse>('GET', `/api/debriefs/${encodeURIComponent(token)}`);
}

export async function deleteDebrief(token: string): Promise<void> {
  if (isMock()) {
    await (await mock()).debrief(token, true);
    return;
  }
  await request<unknown>('DELETE', `/api/debriefs/${encodeURIComponent(token)}`);
}
