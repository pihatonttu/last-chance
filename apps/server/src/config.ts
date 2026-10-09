import path from 'node:path';

export interface Config {
  port: number;
  /** Holds saari.db (pseudonymised debriefs only). */
  dataDir: string;
  /** Built client to serve with SPA fallback; null = API and WebSocket only. */
  staticDir: string | null;
  /** Divides every phase length; tests use a large value to run phases fast. */
  timeScale: number;
  /** Use the last X-Forwarded-For hop as the client address (behind Traefik). */
  trustProxy: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, cwd: string = process.cwd()): Config {
  const port = Number(env.PORT ?? 8080);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new Error(`invalid PORT: ${env.PORT}`);

  const timeScale = Number(env.TIME_SCALE ?? 1);
  if (!Number.isFinite(timeScale) || timeScale <= 0) throw new Error(`invalid TIME_SCALE: ${env.TIME_SCALE}`);

  const staticDir = env.STATIC_DIR ? path.resolve(cwd, env.STATIC_DIR) : null;
  return {
    port,
    dataDir: path.resolve(cwd, env.DATA_DIR ?? 'data'),
    staticDir,
    timeScale,
    trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
  };
}
