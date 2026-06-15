import type { DB } from './db.js';
import type { VariantFamily } from '../dedup/families.js';

interface FamilyRow {
  id: string;
  members: string;
  updated_at: number;
}

/** CRUD over the curated variant families that drive canonical dedup. */
export class FamiliesRepo {
  constructor(private readonly db: DB) {}

  all(): VariantFamily[] {
    const rows = this.db
      .prepare('SELECT id, members, updated_at FROM families ORDER BY id ASC')
      .all() as FamilyRow[];
    return rows.map(rowToFamily);
  }

  get(id: string): VariantFamily | undefined {
    const row = this.db
      .prepare('SELECT id, members, updated_at FROM families WHERE id = ?')
      .get(id) as FamilyRow | undefined;
    return row ? rowToFamily(row) : undefined;
  }

  /** Insert or replace a family. Members are stored as a JSON array, base form first. */
  upsert(family: VariantFamily): VariantFamily {
    this.db
      .prepare(
        `INSERT INTO families (id, members, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET members = excluded.members, updated_at = excluded.updated_at`,
      )
      .run(family.id, JSON.stringify(family.members), Date.now());
    return this.get(family.id)!;
  }

  remove(id: string): boolean {
    return this.db.prepare('DELETE FROM families WHERE id = ?').run(id).changes > 0;
  }
}

function rowToFamily(row: FamilyRow): VariantFamily {
  const members = safeParseMembers(row.members);
  return { id: row.id, members };
}

function safeParseMembers(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((m): m is string => typeof m === 'string') : [];
  } catch {
    return [];
  }
}
