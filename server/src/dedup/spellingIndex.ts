import type { Gender, SpellingVariant } from '../types.js';
import type { NameRecord } from '../data/names.js';
import { canonicalKey } from './canonicalizer.js';
import { getFamilies, familyIdFor } from './families.js';
import { normalizeName } from './phonetics.js';

interface IndexedSpelling {
  name: string;
  count: number;
}

/**
 * Groups known spellings by canonical key so we can answer two questions:
 *   - "what is the most common spelling of this name?" (representative), and
 *   - "what are the common spellings of this name?" (the liked-name detail view).
 *
 * Built from the names dataset, with curated family members folded in so a
 * family's spellings appear even when the dataset doesn't list them all.
 */
export class SpellingIndex {
  /** canonicalKey -> (normalizedSpelling -> spelling+count) */
  private groups = new Map<string, Map<string, IndexedSpelling>>();

  constructor(records: NameRecord[]) {
    this.rebuild(records);
  }

  /**
   * Rebuild the whole index from a fresh set of records. Called on boot from the
   * database and again after the admin panel edits the names or families, so the
   * deck reflects changes without a restart.
   */
  rebuild(records: NameRecord[]): void {
    this.groups = new Map();
    for (const record of records) {
      this.add(record.name, record.gender, record.count);
    }
    this.foldInFamilies();
  }

  /** Add or reinforce a spelling. Higher counts win for display/representative. */
  add(name: string, gender: Gender | undefined, count: number): void {
    const key = canonicalKey(name, gender);
    const norm = normalizeName(name);
    let group = this.groups.get(key);
    if (!group) {
      group = new Map();
      this.groups.set(key, group);
    }
    const existing = group.get(norm);
    if (existing) {
      existing.count = Math.max(existing.count, count);
    } else {
      group.set(norm, { name, count });
    }
  }

  /**
   * Ensure every curated family member appears in its group, even with no
   * popularity data, so "common spellings" reflects the full family.
   */
  private foldInFamilies(): void {
    for (const family of getFamilies()) {
      let group = this.groups.get(family.id);
      if (!group) {
        group = new Map();
        this.groups.set(family.id, group);
      }
      for (const member of family.members) {
        const norm = normalizeName(member);
        if (!group.has(norm)) group.set(norm, { name: member, count: 0 });
      }
    }
  }

  /** Declared order of a family member, for stable tie-breaking (lower = earlier). */
  private familyOrder(name: string): number {
    const familyId = familyIdFor(name);
    if (!familyId) return Number.MAX_SAFE_INTEGER;
    const members = getFamilies().find((f) => f.id === familyId)?.members ?? [];
    const idx = members.findIndex((m) => normalizeName(m) === normalizeName(name));
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  }

  /**
   * The common spellings of `name`, most popular first. If the name isn't known
   * to the index, returns just the name itself as its own sole spelling.
   */
  variantsOf(name: string, gender?: Gender): SpellingVariant[] {
    const key = canonicalKey(name, gender);
    const group = this.groups.get(key);

    if (!group || group.size === 0) {
      return [{ name, popularity: 0, primary: true }];
    }

    const sorted = [...group.values()].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const order = this.familyOrder(a.name) - this.familyOrder(b.name);
      if (order !== 0) return order;
      return a.name.localeCompare(b.name);
    });

    return sorted.map((s, i) => ({ name: s.name, popularity: s.count, primary: i === 0 }));
  }

  /**
   * The representative (most common) spelling for `name`'s canonical group.
   * Falls back to the input name when the group is unknown.
   */
  representativeFor(name: string, gender?: Gender): string {
    return this.variantsOf(name, gender)[0]?.name ?? name;
  }
}
