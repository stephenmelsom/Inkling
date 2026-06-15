import type {
  DeckCard,
  Gender,
  NameFeatures,
  PreferenceProfile,
} from '../types.js';
import { normalizeName } from '../dedup/phonetics.js';

/**
 * The recommendation engine. It turns a session's likes (positive signal) and
 * dislikes (negative signal) into a `PreferenceProfile`, then scores candidate
 * names against that profile so the deck can surface names matching the user's
 * taste. Pure and dependency-light — no I/O, no LLM — so it personalises the
 * deck even when no API key is configured.
 *
 * Features are deliberately shallow (origin, first/last sounds, length,
 * syllable count): enough to capture "I like short Greek girl names ending in
 * -ia" without pretending to model semantics.
 */

/** Scoring weights, highest-signal feature first. */
const WEIGHTS = {
  origin: 3,
  ending: 2,
  initial: 1,
  gender: 1,
  syllables: 1,
  length: 0.5,
} as const;

/** Penalties for matching a feature the user has only ever rejected. */
const AVOID_PENALTY = {
  origin: 2,
  ending: 1.5,
  initial: 0.5,
} as const;

/** Extract the taste signals from a single card. */
export function nameFeatures(card: DeckCard): NameFeatures {
  const norm = normalizeName(card.name);
  const syllables = norm.match(/[aeiouy]+/g)?.length ?? 1;
  return {
    origin: card.origin?.trim().toLowerCase() || undefined,
    gender: card.gender,
    initial: norm.slice(0, 1),
    ending: norm.length >= 2 ? norm.slice(-2) : norm,
    syllables: Math.max(1, syllables),
    length: norm.length,
  };
}

function bump<K>(map: Map<K, number>, key: K | undefined): void {
  if (key === undefined || key === '') return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

/** Build a preference profile from liked and disliked cards. */
export function buildProfile(likes: DeckCard[], dislikes: DeckCard[]): PreferenceProfile {
  const origins = new Map<string, number>();
  const initials = new Map<string, number>();
  const endings = new Map<string, number>();
  const genders = new Map<Gender, number>();
  let syllableSum = 0;
  let lengthSum = 0;

  for (const card of likes) {
    const f = nameFeatures(card);
    bump(origins, f.origin);
    bump(initials, f.initial);
    bump(endings, f.ending);
    bump(genders, f.gender);
    syllableSum += f.syllables;
    lengthSum += f.length;
  }

  const count = likes.length;

  // Negative signal: a feature counts as "avoid" only if the user has rejected
  // it and never liked it, so a shared trait between a like and a dislike
  // doesn't get penalised.
  const avoid = new Set<string>();
  for (const card of dislikes) {
    const f = nameFeatures(card);
    if (f.origin && !origins.has(f.origin)) avoid.add(`origin:${f.origin}`);
    if (f.ending && !endings.has(f.ending)) avoid.add(`ending:${f.ending}`);
    if (f.initial && !initials.has(f.initial)) avoid.add(`initial:${f.initial}`);
  }

  return {
    count,
    origins,
    initials,
    endings,
    genders,
    avgSyllables: count ? syllableSum / count : 0,
    avgLength: count ? lengthSum / count : 0,
    avoid,
    summary: summarise(origins, endings, genders, count, lengthSum),
    isEmpty: likes.length === 0 && dislikes.length === 0,
  };
}

/** Score a candidate's affinity to the profile. Higher = better match. */
export function scoreCandidate(f: NameFeatures, profile: PreferenceProfile): number {
  if (profile.isEmpty) return 0;
  let score = 0;

  if (profile.count > 0) {
    const freq = (map: Map<string, number>, key?: string) =>
      key && map.has(key) ? map.get(key)! / profile.count : 0;

    score += WEIGHTS.origin * freq(profile.origins, f.origin);
    score += WEIGHTS.ending * freq(profile.endings, f.ending);
    score += WEIGHTS.initial * freq(profile.initials, f.initial);
    if (f.gender && profile.genders.has(f.gender)) {
      score += WEIGHTS.gender * (profile.genders.get(f.gender)! / profile.count);
    }
    // Closeness on numeric features: full credit at an exact match, fading out.
    score += WEIGHTS.syllables * Math.max(0, 1 - Math.abs(f.syllables - profile.avgSyllables) / 3);
    score += WEIGHTS.length * Math.max(0, 1 - Math.abs(f.length - profile.avgLength) / 6);
  }

  if (f.origin && profile.avoid.has(`origin:${f.origin}`)) score -= AVOID_PENALTY.origin;
  if (profile.avoid.has(`ending:${f.ending}`)) score -= AVOID_PENALTY.ending;
  if (profile.avoid.has(`initial:${f.initial}`)) score -= AVOID_PENALTY.initial;

  return score;
}

/**
 * Order candidates by affinity while reserving room for discovery: the bottom
 * `exploreFraction` of ranked cards are shuffled and woven back in (~1 in 3),
 * so the deck leans into the user's taste without collapsing into a filter
 * bubble. Returns the input order unchanged when there's no profile to rank by.
 */
export function rankCards(
  cards: DeckCard[],
  profile: PreferenceProfile,
  exploreFraction = 0.3,
): DeckCard[] {
  if (profile.isEmpty || cards.length <= 1) return cards;

  const ranked = cards
    .map((card) => ({ card, score: scoreCandidate(nameFeatures(card), profile) }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.card);

  const exploreCount = Math.round(ranked.length * exploreFraction);
  const exploit = ranked.slice(0, ranked.length - exploreCount);
  const explore = shuffle(ranked.slice(ranked.length - exploreCount));

  // Weave ~2 exploit : 1 explore so discoveries are sprinkled through the deck.
  const out: DeckCard[] = [];
  let ei = 0;
  let xi = 0;
  let sinceExplore = 0;
  while (ei < exploit.length || xi < explore.length) {
    const takeExploit = ei < exploit.length && (sinceExplore < 2 || xi >= explore.length);
    if (takeExploit) {
      out.push(exploit[ei++]);
      sinceExplore++;
    } else {
      out.push(explore[xi++]);
      sinceExplore = 0;
    }
  }
  return out;
}

/** Fisher–Yates, in place; returns the same array for convenience. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** A short human-readable taste summary for steering the LLM prompt. */
function summarise(
  origins: Map<string, number>,
  endings: Map<string, number>,
  genders: Map<Gender, number>,
  count: number,
  lengthSum: number,
): string {
  if (count === 0) return '';
  const parts: string[] = [];

  const topGender = top(genders, 1)[0];
  if (topGender) parts.push(`${topGender} names`);

  const topOrigins = top(origins, 2);
  if (topOrigins.length) parts.push(`origins like ${topOrigins.join(', ')}`);

  const topEndings = top(endings, 2);
  if (topEndings.length) parts.push(`endings like ${topEndings.map((e) => `-${e}`).join(', ')}`);

  const avgLen = lengthSum / count;
  parts.push(avgLen <= 4 ? 'short names' : avgLen >= 7 ? 'longer names' : 'medium-length names');

  return parts.join('; ');
}

/** The `n` most frequent keys, most frequent first. */
function top<K>(map: Map<K, number>, n: number): K[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}
