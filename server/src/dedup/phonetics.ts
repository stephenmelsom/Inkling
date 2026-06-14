import { doubleMetaphone } from 'double-metaphone';

/** Normalise a name for keying: lowercase, strip accents and non-letters. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

/**
 * Phonetic code used to auto-group spelling variants. Double Metaphone maps
 * names that *sound the same* to the same code regardless of spelling, which is
 * exactly the spelling-variant relationship we want to collapse:
 *   Catherine / Katherine / Kathryn -> "K0RN" (primary)
 *   Sophia / Sofia                  -> "SF"
 *   Aiden / Aidan / Ayden           -> "ATN"
 *
 * We key on the primary code. This is a heuristic and can occasionally
 * over-merge sound-alikes that are arguably different names (e.g. Jon/Joan);
 * the curated family layer (`families.ts`) exists to correct the cases that
 * matter, since it takes precedence over this code.
 */
export function phoneticCode(name: string): string {
  const normalized = normalizeName(name);
  if (!normalized) return '';
  const [primary] = doubleMetaphone(normalized);
  // Fall back to the normalized spelling if Double Metaphone yields nothing.
  return primary || normalized;
}
