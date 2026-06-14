import { randomUUID } from 'node:crypto';
import type {
  DeckCard,
  Gender,
  LikedName,
  NameCandidate,
  NameProvider,
  ProposalContext,
} from '../types.js';
import { canonicalKey } from '../dedup/canonicalizer.js';
import { SpellingIndex } from '../dedup/spellingIndex.js';
import type { SessionState } from '../session/store.js';

const QUEUE_LOW_WATERMARK = 6;
const QUEUE_TARGET = 16;

/**
 * Orchestrates the swipe experience: gathers candidates from every available
 * provider, collapses spelling/nickname duplicates via the canonicalization
 * engine so the user only ever swipes on semantically distinct names, serves
 * cards one at a time, and records likes/dislikes.
 */
export class DeckService {
  constructor(
    private readonly providers: NameProvider[],
    private readonly spellingIndex: SpellingIndex,
  ) {}

  /** Names of the providers currently able to contribute. */
  async availableProviders(): Promise<string[]> {
    const flags = await Promise.all(
      this.providers.map(async (p) => ({ id: p.id, ok: await p.isAvailable() })),
    );
    return flags.filter((f) => f.ok).map((f) => f.id);
  }

  /** Serve the next card, refilling the queue from providers if it's low. */
  async next(session: SessionState): Promise<DeckCard | null> {
    if (session.queue.length <= QUEUE_LOW_WATERMARK) {
      await this.refill(session);
    }
    const card = session.queue.shift();
    return card ?? null;
  }

  /** Record a swipe. Returns false if the card id is unknown. */
  swipe(session: SessionState, cardId: string, direction: 'like' | 'dislike'): boolean {
    const card = session.cardsById.get(cardId);
    if (!card) return false;
    if (direction === 'like') {
      session.likes.push(card);
    } else {
      session.dislikedKeys.add(card.canonicalKey);
    }
    return true;
  }

  /** The user's liked names, each expanded with the common spellings of its group. */
  likedNames(session: SessionState): LikedName[] {
    return session.likes.map((card) => ({
      cardId: card.id,
      name: card.name,
      gender: card.gender,
      origin: card.origin,
      meaning: card.meaning,
      source: card.source,
      canonicalKey: card.canonicalKey,
      spellings: this.spellingIndex.variantsOf(card.name, card.gender),
    }));
  }

  /**
   * Pull fresh candidates from every available provider, dedup them against
   * everything already seen/liked/disliked (and against each other), and top up
   * the queue.
   */
  private async refill(session: SessionState): Promise<void> {
    const need = QUEUE_TARGET - session.queue.length;
    if (need <= 0) return;

    const available = (
      await Promise.all(
        this.providers.map(async (p) => ((await p.isAvailable()) ? p : null)),
      )
    ).filter((p): p is NameProvider => p !== null);

    if (available.length === 0) return;

    const ctx: ProposalContext = {
      gender: session.gender,
      liked: session.likes.map((c) => c.name),
      disliked: [...session.dislikedKeys],
      seenCanonicalKeys: [...session.seenKeys],
      // Over-ask: dedup discards a lot, and we split the ask across providers.
      count: Math.max(4, Math.ceil((need * 2) / available.length)),
    };

    const batches = await Promise.all(
      available.map((p) => p.propose(ctx).catch(() => [] as NameCandidate[])),
    );

    // Interleave providers so one source doesn't dominate the top of the deck.
    for (const candidate of interleave(batches)) {
      if (session.queue.length >= QUEUE_TARGET) break;
      this.tryEnqueue(session, candidate);
    }
  }

  /** Build a deduped card from a candidate, or skip it. */
  private tryEnqueue(session: SessionState, candidate: NameCandidate): void {
    if (!candidate.name?.trim()) return;
    const gender: Gender | undefined = candidate.gender ?? session.gender;
    const key = canonicalKey(candidate.name, gender);

    if (session.seenKeys.has(key) || session.dislikedKeys.has(key)) return;

    // Show the most common spelling of the group, not whatever spelling the
    // provider happened to use.
    const representative = this.spellingIndex.representativeFor(candidate.name, gender);

    const card: DeckCard = {
      id: randomUUID(),
      name: representative,
      gender,
      origin: candidate.origin,
      meaning: candidate.meaning,
      source: candidate.source,
      canonicalKey: key,
    };

    session.seenKeys.add(key);
    session.queue.push(card);
    session.cardsById.set(card.id, card);
  }
}

/** Round-robin flatten: [[a1,a2],[b1]] -> [a1,b1,a2]. */
function interleave<T>(batches: T[][]): T[] {
  const out: T[] = [];
  const max = Math.max(0, ...batches.map((b) => b.length));
  for (let i = 0; i < max; i++) {
    for (const batch of batches) {
      if (i < batch.length) out.push(batch[i]);
    }
  }
  return out;
}
