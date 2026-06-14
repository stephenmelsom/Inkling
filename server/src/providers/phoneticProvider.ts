import type { Gender, NameCandidate, NameProvider, ProposalContext } from '../types.js';

/**
 * Algorithmic / phonetic provider. Generates novel, pronounceable names from
 * phonotactic building blocks, and — when the user has liked names — blends
 * their onsets and codas to produce names "in the same vein". Fully offline and
 * always available, so it's the deck's dependable fallback when networked
 * providers (LLM, external API) can't run.
 */

const ONSETS = ['', 'b', 'br', 'd', 'dr', 'f', 'fr', 'j', 'k', 'l', 'm', 'n', 'r', 's', 'st', 'th', 't', 'v', 'z', 'el', 'ar', 'mar', 'cal'];
const NUCLEI = ['a', 'e', 'i', 'o', 'u', 'ai', 'ia', 'ee', 'ae', 'ey', 'io', 'au', 'ea'];

const ENDINGS: Record<Gender, string[]> = {
  girl: ['a', 'ia', 'elle', 'ina', 'ora', 'ie', 'lyn', 'ssa', 'wen', 'ette', 'is', 'wyn'],
  boy: ['o', 'an', 'en', 'us', 'iel', 'ar', 'on', 'ix', 'as', 'ek', 'ian', 'or'],
  neutral: ['en', 'ar', 'yn', 'ix', 'ow', 'ey', 'is', 'ory', 'an'],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Tidy up awkward letter runs so generated names stay pronounceable. */
function smooth(raw: string): string {
  return raw
    .replace(/([aeiou])\1{2,}/g, '$1$1') // cap vowel runs
    .replace(/([^aeiou])\1{2,}/g, '$1$1') // cap consonant runs
    .replace(/[^a-z]/g, '');
}

function syntheticName(gender: Gender): string {
  const syllables = Math.random() < 0.55 ? 2 : 3;
  let out = '';
  for (let i = 0; i < syllables - 1; i++) {
    out += pick(ONSETS) + pick(NUCLEI);
  }
  out += pick(ENDINGS[gender]);
  out = smooth(out);
  if (out.length < 3) return syntheticName(gender);
  return capitalize(out.slice(0, 10));
}

/** Blend two liked names: onset of one + tail of the other. */
function blendName(a: string, b: string, gender: Gender): string {
  const head = a.slice(0, Math.max(2, Math.ceil(a.length / 2)));
  const tailSource = b.length > 2 ? b : `${b}${pick(ENDINGS[gender])}`;
  const tail = tailSource.slice(Math.floor(tailSource.length / 2));
  const blended = smooth((head + tail).toLowerCase());
  if (blended.length < 3) return syntheticName(gender);
  return capitalize(blended.slice(0, 10));
}

export class PhoneticNameProvider implements NameProvider {
  id = 'phonetic';
  label = 'Algorithmic / phonetic';

  isAvailable(): boolean {
    return true;
  }

  async propose(ctx: ProposalContext): Promise<NameCandidate[]> {
    const gender: Gender = ctx.gender ?? pick<Gender>(['girl', 'boy', 'neutral']);
    const liked = ctx.liked.filter((n) => n.length >= 2);
    const out: NameCandidate[] = [];
    const seenLocal = new Set<string>();

    // Aim for roughly a third blends (when we have liked names to blend) and
    // the rest fresh synthetic names.
    const target = Math.max(1, ctx.count);
    let attempts = 0;
    while (out.length < target && attempts < target * 12) {
      attempts++;
      let name: string;
      if (liked.length >= 2 && Math.random() < 0.4) {
        name = blendName(pick(liked), pick(liked), gender);
      } else if (liked.length === 1 && Math.random() < 0.3) {
        name = blendName(liked[0], syntheticName(gender), gender);
      } else {
        name = syntheticName(gender);
      }
      const lower = name.toLowerCase();
      if (seenLocal.has(lower)) continue;
      seenLocal.add(lower);
      out.push({ name, gender, source: this.id });
    }
    return out;
  }
}
