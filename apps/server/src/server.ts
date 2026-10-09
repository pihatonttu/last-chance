import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { realScheduler } from './clock.ts';
import type { Config } from './config.ts';
import { createHttpHandler } from './http.ts';
import { Hub } from './hub.ts';
import type { Debriefing, Naming } from './session.ts';
import { DebriefStore } from './store.ts';
import { attachWebSockets } from './ws.ts';

/** How often ended and idle games are dropped from memory. */
const SWEEP_MS = 5 * 60 * 1000;
/** How often expired debriefs are deleted (also once at start-up). */
const PURGE_MS = 60 * 60 * 1000;

export interface ServerOptions {
  log?: (line: string) => void;
  heartbeatMs?: number;
  naming?: Naming;
  debriefing?: Debriefing;
}

export interface RunningServer {
  readonly port: number;
  readonly hub: Hub;
  readonly store: DebriefStore;
  close(): Promise<void>;
}

export async function startServer(config: Config, options: ServerOptions = {}): Promise<RunningServer> {
  const log = options.log ?? ((line: string) => console.log(line));
  const store = new DebriefStore(config.dataDir);
  const purge = () => {
    try {
      const n = store.purgeExpired();
      if (n > 0) log(`deleted ${n} expired debriefs`);
    } catch (error) {
      log(`purging debriefs failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  purge();

  const hub = new Hub({
    scheduler: realScheduler,
    timeScale: config.timeScale,
    store,
    log,
    ...(options.naming ? { naming: options.naming } : {}),
    ...(options.debriefing ? { debriefing: options.debriefing } : {}),
  });
  const server = http.createServer(
    createHttpHandler({ hub, store, staticDir: config.staticDir, trustProxy: config.trustProxy, log }),
  );
  const sockets = attachWebSockets(server, hub, options.heartbeatMs ? { heartbeatMs: options.heartbeatMs } : {});
  const sweep = setInterval(() => hub.sweep(), SWEEP_MS);
  const purgeTimer = setInterval(purge, PURGE_MS);
  sweep.unref();
  purgeTimer.unref();

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(config.port, () => {
        server.off('error', reject);
        resolve();
      });
    });
  } catch (error) {
    clearInterval(sweep);
    clearInterval(purgeTimer);
    store.close();
    throw error;
  }

  let closing: Promise<void> | null = null;
  return {
    port: (server.address() as AddressInfo).port,
    hub,
    store,
    close() {
      closing ??= (async () => {
        clearInterval(sweep);
        clearInterval(purgeTimer);
        hub.dispose();
        await sockets.close();
        const closed = new Promise<void>((resolve) => server.close(() => resolve()));
        server.closeAllConnections();
        await closed;
        store.close();
      })();
      return closing;
    },
  };
}
