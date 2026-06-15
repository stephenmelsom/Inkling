import { describe, it, expect } from 'vitest';
import {
  buildProfile,
  nameFeatures,
  scoreCandidate,
} from '../src/recommend/profile.js';
import type { DeckCard, Gender } from '../src/types.js';

let counter = 0;
function card(name: string, opts: Partial<DeckCard> = {}): DeckCard {
  return {
    id: `c${counter++}`,
    name,
    gender: opts.gender ?? 'girl',
    origin: opts.origin,
    meaning: opts.meaning,
    source: opts.source ?? 'test',
    canonicalKey: opts.canonicalKey ?? `k:${name.toLowerCase()}`,
  };
}

describe('nameFeatures', () => {
  it('extracts origin, ending, syllables and length', () => {
    const f = nameFeatures(card('Sophia', { origin: 'Greek' }));
    expect(f.origin).toBe('greek');
    expect(f.initial).toBe('s');
    expect(f.ending).toBe('ia');
    expect(f.syllables).toBe(2); // vowel-group proxy: "o" + "ia"
    expect(f.length).toBe(6);
  });

  it('treats a missing origin as undefined', () => {
    expect(nameFeatures(card('Mae')).origin).toBeUndefined();
  });
});

describe('buildProfile', () => {
  const likes = [
    card('Sophia', { origin: 'Greek' }),
    card('Olivia', { origin: 'Latin' }),
    card('Mia', { origin: 'Latin' }),
  ];

  it('aggregates liked features', () => {
    const p = buildProfile(likes, []);
    expect(p.count).toBe(3);
    expect(p.origins.get('latin')).toBe(2);
    expect(p.origins.get('greek')).toBe(1);
    expect(p.endings.get('ia')).toBe(3);
    expect(p.isEmpty).toBe(false);
    expect(p.summary).toContain('girl names');
    expect(p.summary).toMatch(/-ia/);
  });

  it('marks disliked-only features as avoid, sparing shared traits', () => {
    const dislikes = [
      card('Brünnhilde', { origin: 'German' }), // origin never liked -> avoid
      card('Patricia', { origin: 'Latin' }), // origin & ending also liked -> spared
    ];
    const p = buildProfile(likes, dislikes);
    expect(p.avoid.has('origin:german')).toBe(true);
    expect(p.avoid.has('origin:latin')).toBe(false);
    expect(p.avoid.has('ending:ia')).toBe(false);
  });

  it('is empty only when there is no signal at all', () => {
    expect(buildProfile([], []).isEmpty).toBe(true);
    expect(buildProfile([], [card('Brutus', { gender: 'boy' })]).isEmpty).toBe(false);
  });
});

describe('scoreCandidate', () => {
  const profile = buildProfile(
    [
      card('Sophia', { origin: 'Greek' }),
      card('Olivia', { origin: 'Greek' }),
      card('Amelia', { origin: 'Greek' }),
    ],
    [card('Brutus', { origin: 'Roman', gender: 'boy' })],
  );

  it('ranks a name matching the liked profile above an unrelated one', () => {
    const match = scoreCandidate(nameFeatures(card('Julia', { origin: 'Greek' })), profile);
    const unrelated = scoreCandidate(
      nameFeatures(card('Brunhild', { origin: 'Norse', gender: 'girl' })),
      profile,
    );
    expect(match).toBeGreaterThan(unrelated);
  });

  it('penalizes a name sharing a disliked-only feature', () => {
    const neutral = card('Greta', { origin: 'Swedish', gender: 'girl' });
    const sharesAvoided = card('Brutus', { origin: 'Roman', gender: 'girl' as Gender });
    expect(scoreCandidate(nameFeatures(sharesAvoided), profile)).toBeLessThan(
      scoreCandidate(nameFeatures(neutral), profile),
    );
  });

  it('returns 0 for an empty profile (cold start)', () => {
    const empty = buildProfile([], []);
    expect(scoreCandidate(nameFeatures(card('Sophia', { origin: 'Greek' })), empty)).toBe(0);
  });
});
