import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';

describe('loadConfig', () => {
  it('has defaults', () => {
    const config = loadConfig({}, '/srv/app');
    expect(config).toEqual({
      port: 8080,
      dataDir: path.resolve('/srv/app', 'data'),
      staticDir: null,
      timeScale: 1,
      trustProxy: false,
    });
  });

  it('reads the environment', () => {
    const config = loadConfig(
      { PORT: '9000', DATA_DIR: '/var/saari', STATIC_DIR: 'public', TIME_SCALE: '50', TRUST_PROXY: '1' },
      '/srv/app',
    );
    expect(config).toEqual({
      port: 9000,
      dataDir: path.resolve('/var/saari'),
      staticDir: path.resolve('/srv/app', 'public'),
      timeScale: 50,
      trustProxy: true,
    });
  });

  it('rejects nonsense', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadConfig({ PORT: '70000' })).toThrow(/PORT/);
    expect(() => loadConfig({ TIME_SCALE: '0' })).toThrow(/TIME_SCALE/);
    expect(() => loadConfig({ TIME_SCALE: '-2' })).toThrow(/TIME_SCALE/);
  });
});
