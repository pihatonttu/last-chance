import { loadConfig } from './config.ts';
import { startServer } from './server.ts';

const config = loadConfig();
const server = await startServer(config);
console.log(
  `saari server on port ${server.port}` +
    (config.staticDir ? `, client from ${config.staticDir}` : ', no client (STATIC_DIR unset)') +
    (config.timeScale !== 1 ? `, TIME_SCALE ${config.timeScale}` : ''),
);

let stopping = false;
function stop(signal: string): void {
  if (stopping) return;
  stopping = true;
  console.log(`${signal}: shutting down`);
  setTimeout(() => process.exit(1), 10_000).unref();
  server.close().then(
    () => process.exit(0),
    (error: unknown) => {
      console.error(error);
      process.exit(1);
    },
  );
}

process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));
