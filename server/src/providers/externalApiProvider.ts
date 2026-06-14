import type { Gender, NameCandidate, NameProvider, ProposalContext } from '../types.js';
import { SEED_NAMES, type NameRecord } from '../data/names.js';

/**
 * External names provider. Surfaces real, popularity-ranked names.
 *
 * By default it samples the bundled SSA-style dataset (so it works fully
 * offline and deterministically in tests). If `NAMEGEN_NAMES_API_URL` is set,
 * it first tries to pull a fresh list from that endpoint at runtime — the
 * integration point for the live US SSA dataset or any public names API — and
 * falls back to the bundled data on any error or timeout.
 *
 * The endpoint is expected to return JSON: `[{ name, gender, count }, ...]`.
 */
export class ExternalApiNameProvider implements NameProvider {
  id = 'external';
  label = 'External names data';

  private readonly apiUrl = process.env.NAMEGEN_NAMES_API_URL;
  private cache: NameRecord[] | null = null;

  isAvailable(): boolean {
    // Always available: it has the bundled dataset to fall back on.
    return true;
  }

  private async records(): Promise<NameRecord[]> {
    if (this.cache) return this.cache;
    this.cache = (await this.tryFetchLive()) ?? SEED_NAMES;
    return this.cache;
  }

  private async tryFetchLive(): Promise<NameRecord[] | null> {
    if (!this.apiUrl) return null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(this.apiUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data: unknown = await res.json();
      if (!Array.isArray(data)) return null;
      const records = data
        .filter((d): d is NameRecord =>
          !!d && typeof d.name === 'string' && typeof d.count === 'number')
        .map((d) => ({ ...d, gender: (d.gender ?? 'neutral') as Gender }));
      return records.length ? records : null;
    } catch {
      return null; // network blocked / bad payload — fall back to bundled data
    }
  }

  async propose(ctx: ProposalContext): Promise<NameCandidate[]> {
    const all = await this.records();
    const excluded = new Set(
      [...ctx.liked, ...ctx.disliked].map((n) => n.toLowerCase()),
    );

    const pool = all.filter((r) => {
      if (ctx.gender && r.gender !== ctx.gender && r.gender !== 'neutral') return false;
      if (excluded.has(r.name.toLowerCase())) return false;
      return true;
    });

    return weightedSampleWithoutReplacement(pool, ctx.count).map((r) => ({
      name: r.name,
      gender: r.gender,
      origin: r.origin,
      meaning: r.meaning,
      popularity: r.count,
      source: this.id,
    }));
  }
}

/** Sample up to `n` records, weighting by popularity, without replacement. */
function weightedSampleWithoutReplacement(records: NameRecord[], n: number): NameRecord[] {
  const pool = records.slice();
  const out: NameRecord[] = [];
  while (out.length < n && pool.length > 0) {
    const total = pool.reduce((sum, r) => sum + Math.max(1, r.count), 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      roll -= Math.max(1, pool[idx].count);
      if (roll <= 0) break;
    }
    const [chosen] = pool.splice(Math.min(idx, pool.length - 1), 1);
    out.push(chosen);
  }
  return out;
}
