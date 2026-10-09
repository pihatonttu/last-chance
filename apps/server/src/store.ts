import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type { DebriefData } from '@saari/debrief';
import { newSecret } from './ids.ts';

/** Stored debriefs disappear after 30 days (P14). */
export const DEBRIEF_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface StoreOptions {
  now?: () => number;
  ttlMs?: number;
}

/**
 * Pseudonymised debriefs in DATA_DIR/saari.db (P23). Nothing else is ever written
 * to disk: no nicknames, no IPs, no game state.
 */
export class DebriefStore {
  readonly path: string;
  readonly #db: DatabaseSync;
  readonly #now: () => number;
  readonly #ttlMs: number;
  readonly #insert: StatementSync;
  readonly #select: StatementSync;
  readonly #delete: StatementSync;
  readonly #purge: StatementSync;
  readonly #count: StatementSync;

  constructor(dataDir: string, options: StoreOptions = {}) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.path = path.join(dataDir, 'saari.db');
    this.#now = options.now ?? Date.now;
    this.#ttlMs = options.ttlMs ?? DEBRIEF_TTL_MS;
    this.#db = new DatabaseSync(this.path);
    // Deleted rows are overwritten with zeros, so "delete now" really deletes (P14).
    this.#db.exec('PRAGMA secure_delete = ON');
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS debriefs (
        token TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS debriefs_expires_at ON debriefs (expires_at);
    `);
    this.#insert = this.#db.prepare('INSERT INTO debriefs (token, created_at, expires_at, json) VALUES (?, ?, ?, ?)');
    this.#select = this.#db.prepare('SELECT json FROM debriefs WHERE token = ? AND expires_at > ?');
    this.#delete = this.#db.prepare('DELETE FROM debriefs WHERE token = ?');
    this.#purge = this.#db.prepare('DELETE FROM debriefs WHERE expires_at <= ?');
    this.#count = this.#db.prepare('SELECT COUNT(*) AS n FROM debriefs');
  }

  /** Stores a pseudonymised debrief and returns the secret link token. */
  save(debrief: DebriefData): string {
    if (debrief.named !== false) throw new Error('only pseudonymised debriefs may be stored');
    const token = newSecret(32);
    const now = this.#now();
    this.#insert.run(token, now, now + this.#ttlMs, JSON.stringify(debrief));
    return token;
  }

  get(token: string): DebriefData | null {
    const row = this.#select.get(token, this.#now()) as { json: string } | undefined;
    return row ? (JSON.parse(row.json) as DebriefData) : null;
  }

  delete(token: string): boolean {
    return Number(this.#delete.run(token).changes) > 0;
  }

  /** Deletes expired rows; returns how many. */
  purgeExpired(): number {
    return Number(this.#purge.run(this.#now()).changes);
  }

  count(): number {
    const row = this.#count.get() as { n: number };
    return Number(row.n);
  }

  close(): void {
    if (this.#db.isOpen) this.#db.close();
  }
}
