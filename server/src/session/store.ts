import { randomUUID } from 'node:crypto';
import type { DeckCard, Gender } from '../types.js';

/** Per-user swipe session. In-memory; fine for a single-process demo server. */
export interface SessionState {
  id: string;
  gender?: Gender;
  /** Canonical keys already queued or shown — never propose these again. */
  seenKeys: Set<string>;
  /** Cards waiting to be served, in order. */
  queue: DeckCard[];
  /** Cards the user liked, most recent last. */
  likes: DeckCard[];
  /** Canonical keys the user disliked. */
  dislikedKeys: Set<string>;
  /** Lookup for resolving a swipe back to its card. */
  cardsById: Map<string, DeckCard>;
  createdAt: number;
}

export class SessionStore {
  private sessions = new Map<string, SessionState>();

  create(gender?: Gender): SessionState {
    const session: SessionState = {
      id: randomUUID(),
      gender,
      seenKeys: new Set(),
      queue: [],
      likes: [],
      dislikedKeys: new Set(),
      cardsById: new Map(),
      createdAt: Date.now(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): SessionState | undefined {
    return this.sessions.get(id);
  }
}
