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

/** name (normalized) -> family id. Built once at module load. */
const FAMILY_INDEX: Map<string, string> = (() => {
  const index = new Map<string, string>();
  for (const family of VARIANT_FAMILIES) {
    for (const member of family.members) {
      index.set(normalizeName(member), family.id);
    }
  }
  return index;
})();

/** Returns the curated family id for a name, or undefined if it isn't in one. */
export function familyIdFor(name: string): string | undefined {
  return FAMILY_INDEX.get(normalizeName(name));
}

/** All conventional/base spellings declared by a family, in declared order. */
export function familyMembers(familyId: string): string[] {
  return VARIANT_FAMILIES.find((f) => f.id === familyId)?.members ?? [];
}
