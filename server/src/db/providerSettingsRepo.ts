import type { DB } from './db.js';

/** Per-provider operator toggle. A provider is enabled unless explicitly turned off. */
export class ProviderSettingsRepo {
  constructor(private readonly db: DB) {}

  /** Ensure a row exists for a provider id, defaulting to enabled. */
  ensure(id: string): void {
    this.db
      .prepare('INSERT INTO provider_settings (id, enabled) VALUES (?, 1) ON CONFLICT(id) DO NOTHING')
      .run(id);
  }

  isEnabled(id: string): boolean {
    const row = this.db
      .prepare('SELECT enabled FROM provider_settings WHERE id = ?')
      .get(id) as { enabled: number } | undefined;
    // Unknown providers default to enabled so a new provider works before its row exists.
    return row ? row.enabled === 1 : true;
  }

  setEnabled(id: string, enabled: boolean): void {
    this.db
      .prepare(
        `INSERT INTO provider_settings (id, enabled) VALUES (?, ?)
         ON CONFLICT(id) DO UPDATE SET enabled = excluded.enabled`,
      )
      .run(id, enabled ? 1 : 0);
  }

  /** Map of id -> enabled for every provider that has a stored setting. */
  all(): Record<string, boolean> {
    const rows = this.db.prepare('SELECT id, enabled FROM provider_settings').all() as Array<{
      id: string;
      enabled: number;
    }>;
    return Object.fromEntries(rows.map((r) => [r.id, r.enabled === 1]));
  }
}
