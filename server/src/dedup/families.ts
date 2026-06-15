import { normalizeName } from './phonetics.js';

/**
 * Curated "variant families": sets of spellings/forms that should be treated as
 * the same name even when phonetics alone wouldn't group them. This layer does
 * two jobs the phonetic code can't:
 *
 *   1. Nickname / etymological families that don't sound alike but are the same
 *      name semantically — Elizabeth / Eliza / Liza / Beth / Lizbeth. We don't
 *      want the deck to offer "Elizabeth" and "Beth" as two separate swipes.
 *
 *   2. Authoritative grouping for clusters we care about, independent of any
 *      phonetic edge cases.
 *
 * A family takes precedence over the phonetic code: any member name resolves to
 * the family's id. The first spelling listed is the conventional/base form.
 *
 * This list is intentionally easy to extend — add a family and the deck dedup,
 * the spelling index, and the "common spellings" view all pick it up.
 */
export interface VariantFamily {
  id: string;
  /** Spellings/forms in this family. The first is the conventional base form. */
  members: string[];
}

/**
 * The built-in families. These are the *seed* set: on a fresh database they
 * populate the `families` table, after which the database is authoritative and
 * the admin panel can add/edit/remove families. Until `reloadFamilies` is
 * called (e.g. in tests with no database), the seed set is what's active.
 */
export const VARIANT_FAMILIES: VariantFamily[] = [
  { id: 'fam:elizabeth', members: ['Elizabeth', 'Eliza', 'Liza', 'Lizbeth', 'Beth', 'Lisbeth'] },
  { id: 'fam:catherine', members: ['Catherine', 'Katherine', 'Kathryn', 'Katharine', 'Catharine'] },
  { id: 'fam:sophia', members: ['Sophia', 'Sofia', 'Sophie', 'Sofie', 'Sophy'] },
  { id: 'fam:isabel', members: ['Isabella', 'Isabel', 'Isabelle', 'Izabella', 'Isabela', 'Ysabel'] },
  { id: 'fam:madeline', members: ['Madeline', 'Madelyn', 'Madeleine', 'Madalyn', 'Madilyn'] },
  { id: 'fam:catlin', members: ['Kaitlyn', 'Katelyn', 'Caitlin', 'Caitlyn', 'Katelynn', 'Kaitlin', 'Catelyn'] },
  { id: 'fam:aiden', members: ['Aiden', 'Aidan', 'Ayden', 'Aden', 'Adan', 'Aydan'] },
  { id: 'fam:jackson', members: ['Jackson', 'Jaxon', 'Jaxson', 'Jaxton', 'Jakson'] },
  { id: 'fam:muhammad', members: ['Muhammad', 'Mohammed', 'Mohamed', 'Muhammed', 'Mohammad', 'Mohamad'] },
  { id: 'fam:hailey', members: ['Hailey', 'Haley', 'Haylee', 'Hayley', 'Hailee', 'Haleigh'] },
  { id: 'fam:zoe', members: ['Zoe', 'Zoey', 'Zoie', 'Zooey'] },
];

/** The currently-active families. Swapped wholesale by `reloadFamilies`. */
let activeFamilies: VariantFamily[] = VARIANT_FAMILIES;
/** name (normalized) -> family id, derived from `activeFamilies`. */
let familyIndex: Map<string, string> = buildIndex(activeFamilies);

function buildIndex(families: VariantFamily[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const family of families) {
    for (const member of family.members) {
      index.set(normalizeName(member), family.id);
    }
  }
  return index;
}

/**
 * Replace the active family set (e.g. with the rows loaded from the database)
 * and rebuild the lookup index. Call this after any admin edit so the deck's
 * dedup, the spelling index, and the "common spellings" view all pick it up
 * without a restart.
 */
export function reloadFamilies(families: VariantFamily[]): void {
  activeFamilies = families;
  familyIndex = buildIndex(families);
}

/** The currently-active families, in their current order. */
export function getFamilies(): VariantFamily[] {
  return activeFamilies;
}

/** Returns the curated family id for a name, or undefined if it isn't in one. */
export function familyIdFor(name: string): string | undefined {
  return familyIndex.get(normalizeName(name));
}

/** All conventional/base spellings declared by a family, in declared order. */
export function familyMembers(familyId: string): string[] {
  return activeFamilies.find((f) => f.id === familyId)?.members ?? [];
}
