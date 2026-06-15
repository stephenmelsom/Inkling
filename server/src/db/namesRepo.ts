import type { DB } from './db.js';
import type { Gender } from '../types.js';
import type { NameRecord } from '../data/names.js';

/** A names-dataset row with its database id. */
export interface StoredName extends NameRecord {
  id: number;
}

export interface NameInput {
  name: string;
  gender: Gender;
  count: number;
  origin?: string;
  meaning?: string;
}

/** CRUD over the seed-names dataset that feeds the spelling index and the External provider. */
export class NamesRepo {
  constructor(private readonly db: DB) {}

  all(): StoredName[] {
    return this.db
      .prepare('SELECT id, name, gender, count, origin, meaning FROM names ORDER BY count DESC, name ASC')
      .all() as StoredName[];
  }

  /** Optionally filter by a case-insensitive name substring. */
  search(query?: string, limit = 200): StoredName[] {
    if (!query?.trim()) {
      return this.db
        .prepare('SELECT id, name, gender, count, origin, meaning FROM names ORDER BY count DESC, name ASC LIMIT ?')
        .all(limit) as StoredName[];
    }
    return this.db
      .prepare(
        `SELECT id, name, gender, count, origin, meaning FROM names
         WHERE name LIKE ? COLLATE NOCASE
         ORDER BY count DESC, name ASC LIMIT ?`,
      )
      .all(`%${query.trim()}%`, limit) as StoredName[];
  }

  get(id: number): StoredName | undefined {
    return this.db
      .prepare('SELECT id, name, gender, count, origin, meaning FROM names WHERE id = ?')
      .get(id) as StoredName | undefined;
  }

  create(input: NameInput): StoredName {
    const info = this.db
      .prepare('INSERT INTO names (name, gender, count, origin, meaning) VALUES (?, ?, ?, ?, ?)')
      .run(input.name, input.gender, input.count, input.origin ?? null, input.meaning ?? null);
    return this.get(Number(info.lastInsertRowid))!;
  }

  update(id: number, input: NameInput): StoredName | undefined {
    this.db
      .prepare('UPDATE names SET name = ?, gender = ?, count = ?, origin = ?, meaning = ? WHERE id = ?')
      .run(input.name, input.gender, input.count, input.origin ?? null, input.meaning ?? null, id);
    return this.get(id);
  }

  remove(id: number): boolean {
    return this.db.prepare('DELETE FROM names WHERE id = ?').run(id).changes > 0;
  }

  count(): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM names').get() as { n: number }).n;
  }
}
