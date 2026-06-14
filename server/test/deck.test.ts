import { describe, it, expect } from 'vitest';
import { DeckService } from '../src/deck/deckService.js';
import { SpellingIndex } from '../src/dedup/spellingIndex.js';
import { SEED_NAMES } from '../src/data/names.js';
import { SessionStore } from '../src/session/store.js';
import type { NameCandidate, NameProvider, ProposalContext } from '../src/types.js';

const index = new SpellingIndex(SEED_NAMES);

/** A provider that always emits the same fixed candidate list. */
function fixedProvider(names: NameCandidate[]): NameProvider {
  return {
    id: 'fixed',
    label: 'fixed',
    isAvailable: () => true,
    async propose(_ctx: ProposalContext) {
      return names;
    },
  };
}

async function drain(deck: DeckService, store: SessionStore, gender?: 'boy' | 'girl' | 'neutral') {
  const session = store.create(gender);
  const cards = [];
  for (let i = 0; i < 50; i++) {
    const card = await deck.next(session);
    if (!card) break;
    cards.push(card);
  }
  return { session, cards };
}

describe('DeckService dedup', () => {
  it('never serves two cards from the same canonical group', async () => {
    const provider = fixedProvider([
      { name: 'Catherine', gender: 'girl', source: 'fixed' },
      { name: 'Katherine', gender: 'girl', source: 'fixed' },
      { name: 'Kathryn', gender: 'girl', source: 'fixed' },
      { name: 'Sofia', gender: 'girl', source: 'fixed' },
      { name: 'Sophia', gender: 'girl', source: 'fixed' },
      { name: 'Olivia', gender: 'girl', source: 'fixed' },
    ]);
    const deck = new DeckService([provider], index);
    const { cards } = await drain(deck, new SessionStore(), 'girl');

    const keys = cards.map((c) => c.canonicalKey);
    expect(new Set(keys).size).toBe(keys.length); // all distinct
    expect(cards).toHaveLength(3); // catherine, sophia, olivia groups
  });

  it('displays the most common spelling, not the proposed one', async () => {
    const provider = fixedProvider([
      { name: 'Sofia', gender: 'girl', source: 'fixed' }, // less common spelling
    ]);
    const deck = new DeckService([provider], index);
    const { cards } = await drain(deck, new SessionStore(), 'girl');
    expect(cards[0].name).toBe('Sophia');
  });

  it('records likes and expands them into common spellings', async () => {
    const provider = fixedProvider([
      { name: 'Katherine', gender: 'girl', source: 'fixed' },
    ]);
    const store = new SessionStore();
    const deck = new DeckService([provider], index);
    const { session, cards } = await drain(deck, store, 'girl');

    expect(deck.swipe(session, cards[0].id, 'like')).toBe(true);
    const liked = deck.likedNames(session);
    expect(liked).toHaveLength(1);
    expect(liked[0].name).toBe('Katherine');
    expect(liked[0].spellings.map((s) => s.name)).toEqual(
      expect.arrayContaining(['Katherine', 'Catherine', 'Kathryn']),
    );
  });

  it('does not re-serve a disliked group', async () => {
    const provider = fixedProvider([
      { name: 'Catherine', gender: 'girl', source: 'fixed' },
      { name: 'Olivia', gender: 'girl', source: 'fixed' },
    ]);
    const store = new SessionStore();
    const deck = new DeckService([provider], index);
    const session = store.create('girl');

    const first = await deck.next(session);
    expect(first).not.toBeNull();
    deck.swipe(session, first!.id, 'dislike');

    // Drain the rest; the disliked group's other spellings must never appear.
    const rest = [];
    for (let i = 0; i < 20; i++) {
      const card = await deck.next(session);
      if (!card) break;
      rest.push(card);
    }
    expect(rest.some((c) => c.canonicalKey === first!.canonicalKey)).toBe(false);
  });
});
