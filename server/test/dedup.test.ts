import { describe, it, expect } from 'vitest';
import { canonicalKey } from '../src/dedup/canonicalizer.js';
import { SpellingIndex } from '../src/dedup/spellingIndex.js';
import { SEED_NAMES } from '../src/data/names.js';

const index = new SpellingIndex(SEED_NAMES);

describe('canonicalKey', () => {
  it('groups phonetic spelling variants under one key', () => {
    const c = canonicalKey('Catherine', 'girl');
    expect(canonicalKey('Katherine', 'girl')).toBe(c);
    expect(canonicalKey('Kathryn', 'girl')).toBe(c);
  });

  it('groups Sofia/Sophia and the Aiden cluster', () => {
    expect(canonicalKey('Sofia', 'girl')).toBe(canonicalKey('Sophia', 'girl'));
    expect(canonicalKey('Aidan', 'boy')).toBe(canonicalKey('Aiden', 'boy'));
    expect(canonicalKey('Ayden', 'boy')).toBe(canonicalKey('Aiden', 'boy'));
  });

  it('groups nickname families that do not sound alike', () => {
    const eliza = canonicalKey('Elizabeth', 'girl');
    expect(canonicalKey('Beth', 'girl')).toBe(eliza);
    expect(canonicalKey('Eliza', 'girl')).toBe(eliza);
  });

  it('keeps genuinely different names apart', () => {
    expect(canonicalKey('Olivia', 'girl')).not.toBe(canonicalKey('Liam', 'boy'));
    expect(canonicalKey('Noah', 'boy')).not.toBe(canonicalKey('Leo', 'boy'));
  });
});

describe('SpellingIndex', () => {
  it('returns common spellings most-popular first with a primary flag', () => {
    const variants = index.variantsOf('Catherine', 'girl');
    const names = variants.map((v) => v.name);
    expect(names).toContain('Katherine');
    expect(names).toContain('Catherine');
    expect(names).toContain('Kathryn');
    // Katherine (11800) outranks Catherine (9200) in the seed data.
    expect(variants[0].name).toBe('Katherine');
    expect(variants[0].primary).toBe(true);
    expect(variants.slice(1).every((v) => !v.primary)).toBe(true);
  });

  it('picks the most common spelling as the representative', () => {
    expect(index.representativeFor('Catherine', 'girl')).toBe('Katherine');
    expect(index.representativeFor('Sofia', 'girl')).toBe('Sophia');
    expect(index.representativeFor('Aidan', 'boy')).toBe('Aiden');
  });

  it('treats an unknown name as its own sole spelling', () => {
    const variants = index.variantsOf('Zephyrina', 'girl');
    expect(variants).toHaveLength(1);
    expect(variants[0]).toMatchObject({ name: 'Zephyrina', primary: true });
  });
});
