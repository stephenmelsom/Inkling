import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { SEED_NAMES } from '../data/names.js';
import { VARIANT_FAMILIES } from '../dedup/families.js';

/**
 * SQLite is the app's first persistence layer. It's file-based and synchronous,
 * so it adds durable storage without any new infrastructure or a process to run
 * alongside the single Express server.
 *
 * The previously-hardcoded datasets — the seed names and the curated variant
 * families — become *seed data*: on first boot the tables are empty, so we
 * populate them from the static arrays. After that the database is the source
 * of truth and the admin panel edits it directly.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Default DB location: <server>/data/inkling.db, overridable for tests/deploys. */
function defaultDbPath(): string {
  return process.env.INKLING_DB_PATH ?? path.resolve(__dirname, '../../data/inkling.db');
}

export type DB = Database.Database;

/** Open (creating if needed) the database, run migrations, and seed if empty. */
export function openDb(dbPath: string = defaultDbPath()): DB {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  seedIfEmpty(db);
  return db;
}

function migrate(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS names (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      name    TEXT    NOT NULL,
      gender  TEXT    NOT NULL,
      count   INTEGER NOT NULL DEFAULT 0,
      origin  TEXT,
      meaning TEXT
    );

    CREATE TABLE IF NOT EXISTS families (
      id         TEXT    PRIMARY KEY,
      members    TEXT    NOT NULL, -- JSON array of spellings, base form first
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS swipe_events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id    TEXT    NOT NULL,
      canonical_key TEXT    NOT NULL,
      name          TEXT    NOT NULL,
      gender        TEXT,
      source        TEXT,
      direction     TEXT    NOT NULL,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS provider_settings (
      id      TEXT    PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_names_name        ON names(name);
    CREATE INDEX IF NOT EXISTS idx_events_key        ON swipe_events(canonical_key);
    CREATE INDEX IF NOT EXISTS idx_events_direction  ON swipe_events(direction);
  `);
}

/** Populate names/families from the static seed arrays on a fresh database. */
function seedIfEmpty(db: DB): void {
  const nameCount = (db.prepare('SELECT COUNT(*) AS n FROM names').get() as { n: number }).n;
  if (nameCount === 0) {
    const insert = db.prepare(
      'INSERT INTO names (name, gender, count, origin, meaning) VALUES (?, ?, ?, ?, ?)',
    );
    const insertMany = db.transaction((rows: typeof SEED_NAMES) => {
      for (const r of rows) {
        insert.run(r.name, r.gender, r.count, r.origin ?? null, r.meaning ?? null);
      }
    });
    insertMany(SEED_NAMES);
  }

  const famCount = (db.prepare('SELECT COUNT(*) AS n FROM families').get() as { n: number }).n;
  if (famCount === 0) {
    const insert = db.prepare(
      'INSERT INTO families (id, members, updated_at) VALUES (?, ?, ?)',
    );
    const now = Date.now();
    const insertMany = db.transaction((rows: typeof VARIANT_FAMILIES) => {
      for (const f of rows) insert.run(f.id, JSON.stringify(f.members), now);
    });
    insertMany(VARIANT_FAMILIES);
  }
}
