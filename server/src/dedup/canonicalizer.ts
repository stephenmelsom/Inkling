import type { Gender } from '../types.js';
import { familyIdFor } from './families.js';
import { phoneticCode } from './phonetics.js';

/**
 * Reduces a name to a `canonicalKey` — the identity of the *name* rather than
 * the *spelling*. Two inputs that share a canonical key are "the same name" for
 * the purposes of the swipe deck, so the user never sees both.
 *
 * Resolution order:
 *   1. Curated family (authoritative; also catches nickname families).
 *   2. Phonetic code, scoped by gender so e.g. a boy "Jamie" and girl "Jamie"
 *      stay separate streams. Neutral names key without a gender scope so they
 *      can group with either.
 *
 * Gender scoping on the phonetic path prevents accidental cross-gender merges
 * while still letting curated families span genders if ever needed.
 */
export function canonicalKey(name: string, gender?: Gender): string {
  const family = familyIdFor(name);
  if (family) return family;

  const code = phoneticCode(name);
  const scope = gender && gender !== 'neutral' ? gender : 'any';
  return `ph:${scope}:${code}`;
}
