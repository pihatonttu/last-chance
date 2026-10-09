import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEBRIEF_TTL_MS, DebriefStore } from '../src/store.ts';
import { fakeDebrief } from './fixtures.ts';

let dir: string;
let now: number;
let store: DebriefStore;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saari-store-'));
  now = 1_700_000_000_000;
  store = new DebriefStore(dir, { now: () => now });
});

afterEach(() => {
  store.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const stored = () => fakeDebrief([{ id: 'p1', label: 'Pelaaja 1', color: '#123456' }], false);

describe('DebriefStore', () => {
  it('creates saari.db in the data directory', () => {
    expect(fs.existsSync(path.join(dir, 'saari.db'))).toBe(true);
    expect(store.path).toBe(path.join(dir, 'saari.db'));
  });

  it('saves a pseudonymised debrief under a long random token and reads it back', () => {
    const token = store.save(stored());
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(store.get(token)).toEqual(stored());
    expect(store.get('no-such-token-000000000000000000000000000000')).toBeNull();
  });

  it('refuses to store a named debrief', () => {
    expect(() => store.save(fakeDebrief([], true))).toThrow(/pseudonym/);
  });

  it('deletes at once', () => {
    const token = store.save(stored());
    expect(store.delete(token)).toBe(true);
    expect(store.get(token)).toBeNull();
    expect(store.delete(token)).toBe(false);
  });

  it('expires after 30 days, also before the purge runs', () => {
    const token = store.save(stored());
    now += DEBRIEF_TTL_MS - 1;
    expect(store.get(token)).not.toBeNull();
    now += 1;
    expect(store.get(token)).toBeNull();
  });

  it('purges expired rows', () => {
    const old = store.save(stored());
    now += DEBRIEF_TTL_MS / 2;
    const young = store.save(stored());
    now += DEBRIEF_TTL_MS / 2;
    expect(store.purgeExpired()).toBe(1);
    expect(store.count()).toBe(1);
    expect(store.get(old)).toBeNull();
    expect(store.get(young)).not.toBeNull();
  });

  it('keeps rows across reopening', () => {
    const token = store.save(stored());
    store.close();
    store = new DebriefStore(dir, { now: () => now });
    expect(store.get(token)).toEqual(stored());
  });
});
