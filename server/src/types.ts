/**
 * Shared domain types for Inkling.
 *
 * The product has three moving parts that these types tie together:
 *   1. Name-proposal providers, which emit `NameCandidate`s.
 *   2. The canonicalization engine, which collapses candidates that are
 *      "the same name" (spelling variants / nickname families) into one
 *      `canonicalKey` so the user never swipes on duplicates.
 *   3. The swipe deck, which serves one `DeckCard` at a time.
 */

export type Gender = 'boy' | 'girl' | 'neutral';

/** A single name with whatever metadata the proposing system could supply. */
export interface NameCandidate {
  /** The name as proposed, e.g. "Katherine". */
  name: string;
  gender?: Gender;
  /** Cultural/linguistic origin, e.g. "Greek". */
  origin?: string;
  /** Short meaning, e.g. "pure". */
  meaning?: string;
  /**
   * Relative popularity signal (higher = more common). Optional because not
   * every provider knows it. Used to pick the representative spelling and to
   * weight sampling.
   */
  popularity?: number;
  /** Id of the provider that produced this candidate. */
  source: string;
}

/** Context handed to a provider so it can personalise its proposals. */
export interface ProposalContext {
  /** Restrict to a gender, or undefined for any. */
  gender?: Gender;
  /** Representative spellings the user has liked so far. */
  liked: string[];
  /** Representative spellings the user has rejected so far. */
  disliked: string[];
  /**
   * Canonical keys already shown to this user. Providers may use this to bias
   * away from obvious near-duplicates, but the deck enforces dedup regardless.
   */
  seenCanonicalKeys: string[];
  /** How many fresh candidates the deck would like back. */
  count: number;
  /**
   * The user's learned taste, derived from likes/dislikes. Optional and only
   * meaningful once they've swiped; providers may use `profile.summary` to steer
   * generation. The deck ranks candidates against this regardless.
   */
  profile?: PreferenceProfile;
}

/** The taste signals extracted from a single name, used for recommendation. */
export interface NameFeatures {
  /** Cultural origin, lowercased (e.g. "greek"). */
  origin?: string;
  gender?: Gender;
  /** First letter of the normalized spelling. */
  initial: string;
  /** Last two letters of the normalized spelling — captures the "-ia"/"-en" feel. */
  ending: string;
  /** Count of vowel groups (a cheap syllable proxy). */
  syllables: number;
  /** Length of the normalized spelling. */
  length: number;
}

/**
 * A user's aggregated name taste, built from the cards they've liked (positive
 * signal) and disliked (negative signal). Drives both deck ranking and LLM
 * prompt steering.
 */
export interface PreferenceProfile {
  /** Number of liked names backing this profile. */
  count: number;
  /** origin -> like frequency. */
  origins: Map<string, number>;
  /** initial letter -> like frequency. */
  initials: Map<string, number>;
  /** two-letter ending -> like frequency. */
  endings: Map<string, number>;
  /** gender -> like frequency. */
  genders: Map<Gender, number>;
  /** Mean syllable count across likes (0 when there are none). */
  avgSyllables: number;
  /** Mean normalized length across likes (0 when there are none). */
  avgLength: number;
  /** Namespaced features seen only in dislikes, e.g. "origin:french", "ending:yn". */
  avoid: Set<string>;
  /** Human-readable taste summary for prompt steering; empty when no likes. */
  summary: string;
  /** True when there's no signal at all (no likes and no dislikes). */
  isEmpty: boolean;
}

/** A name-proposal system. Implementations live in `providers/`. */
export interface NameProvider {
  /** Stable machine id, e.g. "llm". */
  id: string;
  /** Human-readable label for UI/debugging. */
  label: string;
  /**
   * Whether the provider can currently produce names (e.g. the LLM provider is
   * unavailable without credentials). Cheap, may be async.
   */
  isAvailable(): boolean | Promise<boolean>;
  /** Produce up to `ctx.count` candidates. Must never throw — return [] instead. */
  propose(ctx: ProposalContext): Promise<NameCandidate[]>;
}

/** One card in the swipe deck — already deduped to a canonical group. */
export interface DeckCard {
  /** Unique id for this card within the session. */
  id: string;
  /** The spelling we show: the most common spelling of the canonical group. */
  name: string;
  gender?: Gender;
  origin?: string;
  meaning?: string;
  /** Which provider surfaced this group. */
  source: string;
  /** The canonical group this card represents (internal, but handy for clients). */
  canonicalKey: string;
}

/** A spelling within a canonical group, with its popularity. */
export interface SpellingVariant {
  name: string;
  popularity: number;
  /** True if this is the representative (most common) spelling. */
  primary: boolean;
}

/** A liked name, expanded with the common spellings of its group. */
export interface LikedName {
  cardId: string;
  name: string;
  gender?: Gender;
  origin?: string;
  meaning?: string;
  source: string;
  canonicalKey: string;
  /** Common spellings of this name, most popular first. */
  spellings: SpellingVariant[];
}

export type SwipeDirection = 'like' | 'dislike';
