import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, type DB } from '../src/db/db.js';
import { NamesRepo } from '../src/db/namesRepo.js';
import { FamiliesRepo } from '../src/db/familiesRepo.js';
import { EventsRepo } from '../src/db/eventsRepo.js';
import { ProviderSettingsRepo } from '../src/db/providerSettingsRepo.js';
import { SEED_NAMES } from '../src/data/names.js';
import { VARIANT_FAMILIES } from '../src/dedup/families.js';

let db: DB;
beforeEach(() => {
  db = openDb(':memory:');
});

describe('seeding', () => {
  it('seeds names and families from the static arrays on a fresh database', () => {
    expect(new NamesRepo(db).count()).toBe(SEED_NAMES.length);
    expect(new FamiliesRepo(db).all().length).toBe(VARIANT_FAMILIES.length);
  });
});

describe('NamesRepo', () => {
  it('creates, updates, searches and removes', () => {
    const repo = new NamesRepo(db);
    const created = repo.create({ name: 'Thessaly', gender: 'girl', count: 12, origin: 'Greek' });
    expect(created.id).toBeGreaterThan(0);

    const found = repo.search('thess');
    expect(found.map((n) => n.name)).toContain('Thessaly');

    const updated = repo.update(created.id, { name: 'Thessaly', gender: 'girl', count: 99 });
    expect(updated?.count).toBe(99);

    expect(repo.remove(created.id)).toBe(true);
    expect(repo.get(created.id)).toBeUndefined();
  });
});

describe('FamiliesRepo', () => {
  it('upserts a new family and replaces members on conflict', () => {
    const repo = new FamiliesRepo(db);
    repo.upsert({ id: 'fam:test', members: ['Aaa', 'Bbb'] });
    expect(repo.get('fam:test')?.members).toEqual(['Aaa', 'Bbb']);

    repo.upsert({ id: 'fam:test', members: ['Aaa', 'Bbb', 'Ccc'] });
    expect(repo.get('fam:test')?.members).toEqual(['Aaa', 'Bbb', 'Ccc']);

    expect(repo.remove('fam:test')).toBe(true);
    expect(repo.get('fam:test')).toBeUndefined();
  });
});

describe('ProviderSettingsRepo', () => {
  it('defaults unknown providers to enabled and honours explicit toggles', () => {
    const repo = new ProviderSettingsRepo(db);
    expect(repo.isEnabled('llm')).toBe(true);
    repo.setEnabled('llm', false);
    expect(repo.isEnabled('llm')).toBe(false);
    repo.ensure('phonetic');
    expect(repo.isEnabled('phonetic')).toBe(true);
  });
});

describe('EventsRepo analytics', () => {
  it('aggregates keeps, passes, keep rate and top names by canonical key', () => {
    const repo = new EventsRepo(db);
    const base = { sessionId: 's1', gender: 'girl' as const, source: 'external' };

    // Catherine: 2 keeps, 1 pass under the same canonical key.
    repo.record({ ...base, canonicalKey: 'fam:catherine', name: 'Catherine', direction: 'like' });
    repo.record({ ...base, canonicalKey: 'fam:catherine', name: 'Catherine', direction: 'like' });
    repo.record({ ...base, canonicalKey: 'fam:catherine', name: 'Catherine', direction: 'dislike' });
    // Brutus: 2 passes.
    repo.record({ ...base, sessionId: 's2', canonicalKey: 'ph:boy:PRTS', name: 'Brutus', direction: 'dislike' });
    repo.record({ ...base, sessionId: 's2', canonicalKey: 'ph:boy:PRTS', name: 'Brutus', direction: 'dislike' });

    const s = repo.summary();
    expect(s.totalSwipes).toBe(5);
    expect(s.totalKeeps).toBe(2);
    expect(s.totalPasses).toBe(3);
    expect(s.sessions).toBe(2);
    expect(s.keepRate).toBeCloseTo(2 / 5);

    expect(s.topKept[0]).toMatchObject({ canonicalKey: 'fam:catherine', keeps: 2 });
    expect(s.topKept[0].keepRate).toBeCloseTo(2 / 3);
    expect(s.topPassed[0]).toMatchObject({ canonicalKey: 'ph:boy:PRTS', passes: 2 });
    expect(s.byProvider.find((p) => p.source === 'external')).toMatchObject({ keeps: 2, passes: 3 });
  });
});
