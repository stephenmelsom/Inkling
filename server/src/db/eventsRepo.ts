import type { DB } from './db.js';
import type { Gender, SwipeDirection } from '../types.js';

export interface SwipeEventInput {
  sessionId: string;
  canonicalKey: string;
  name: string;
  gender?: Gender;
  source?: string;
  direction: SwipeDirection;
}

/** One row of the aggregate "most kept / most passed" tables. */
export interface NameTally {
  canonicalKey: string;
  name: string;
  keeps: number;
  passes: number;
  /** keeps / (keeps + passes), 0..1. */
  keepRate: number;
}

export interface ProviderTally {
  source: string;
  keeps: number;
  passes: number;
}

export interface AnalyticsSummary {
  totalSwipes: number;
  totalKeeps: number;
  totalPasses: number;
  sessions: number;
  /** Overall keep rate across all swipes, 0..1. */
  keepRate: number;
  topKept: NameTally[];
  topPassed: NameTally[];
  byProvider: ProviderTally[];
}

/**
 * Records every swipe so the admin panel can show aggregate taste. Swipes are
 * anonymous — a random session id, the name, and the direction — with no PII.
 * The live deck stays in-memory; this table is purely for analytics.
 */
export class EventsRepo {
  constructor(private readonly db: DB) {}

  record(event: SwipeEventInput): void {
    this.db
      .prepare(
        `INSERT INTO swipe_events (session_id, canonical_key, name, gender, source, direction, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        event.sessionId,
        event.canonicalKey,
        event.name,
        event.gender ?? null,
        event.source ?? null,
        event.direction,
        Date.now(),
      );
  }

  summary(topLimit = 12): AnalyticsSummary {
    const totals = this.db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN direction = 'like'    THEN 1 ELSE 0 END) AS keeps,
           SUM(CASE WHEN direction = 'dislike' THEN 1 ELSE 0 END) AS passes,
           COUNT(DISTINCT session_id) AS sessions
         FROM swipe_events`,
      )
      .get() as { total: number; keeps: number | null; passes: number | null; sessions: number };

    const totalKeeps = totals.keeps ?? 0;
    const totalPasses = totals.passes ?? 0;
    const totalSwipes = totals.total ?? 0;

    return {
      totalSwipes,
      totalKeeps,
      totalPasses,
      sessions: totals.sessions ?? 0,
      keepRate: totalSwipes ? totalKeeps / totalSwipes : 0,
      topKept: this.topBy('like', topLimit),
      topPassed: this.topBy('dislike', topLimit),
      byProvider: this.byProvider(),
    };
  }

  /** Most-kept or most-passed names, grouped by canonical key. */
  private topBy(direction: SwipeDirection, limit: number): NameTally[] {
    const rows = this.db
      .prepare(
        `SELECT
           canonical_key AS canonicalKey,
           name,
           SUM(CASE WHEN direction = 'like'    THEN 1 ELSE 0 END) AS keeps,
           SUM(CASE WHEN direction = 'dislike' THEN 1 ELSE 0 END) AS passes
         FROM swipe_events
         GROUP BY canonical_key
         HAVING ${direction === 'like' ? 'keeps' : 'passes'} > 0
         ORDER BY ${direction === 'like' ? 'keeps' : 'passes'} DESC, name ASC
         LIMIT ?`,
      )
      .all(limit) as Array<{ canonicalKey: string; name: string; keeps: number; passes: number }>;

    return rows.map((r) => ({
      canonicalKey: r.canonicalKey,
      name: r.name,
      keeps: r.keeps,
      passes: r.passes,
      keepRate: r.keeps + r.passes ? r.keeps / (r.keeps + r.passes) : 0,
    }));
  }

  private byProvider(): ProviderTally[] {
    return this.db
      .prepare(
        `SELECT
           COALESCE(source, 'unknown') AS source,
           SUM(CASE WHEN direction = 'like'    THEN 1 ELSE 0 END) AS keeps,
           SUM(CASE WHEN direction = 'dislike' THEN 1 ELSE 0 END) AS passes
         FROM swipe_events
         GROUP BY source
         ORDER BY keeps + passes DESC`,
      )
      .all() as ProviderTally[];
  }
}
