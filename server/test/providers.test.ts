import { describe, it, expect } from 'vitest';
import { PhoneticNameProvider } from '../src/providers/phoneticProvider.js';
import { ExternalApiNameProvider } from '../src/providers/externalApiProvider.js';
import { LlmNameProvider } from '../src/providers/llmProvider.js';
import type { ProposalContext } from '../src/types.js';

const baseCtx = (over: Partial<ProposalContext> = {}): ProposalContext => ({
  gender: undefined,
  liked: [],
  disliked: [],
  seenCanonicalKeys: [],
  count: 10,
  ...over,
});

describe('PhoneticNameProvider', () => {
  it('produces the requested number of distinct, capitalised names', async () => {
    const provider = new PhoneticNameProvider();
    const out = await provider.propose(baseCtx({ gender: 'girl', count: 10 }));
    expect(out.length).toBe(10);
    const names = out.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) {
      expect(n).toMatch(/^[A-Z][a-z]+$/);
      expect(n.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('is always available (offline)', () => {
    expect(new PhoneticNameProvider().isAvailable()).toBe(true);
  });
});

describe('ExternalApiNameProvider', () => {
  it('samples real names filtered by gender, excluding liked/disliked', async () => {
    const provider = new ExternalApiNameProvider();
    const out = await provider.propose(
      baseCtx({ gender: 'boy', count: 8, liked: ['Liam'], disliked: ['Noah'] }),
    );
    expect(out.length).toBeGreaterThan(0);
    for (const c of out) {
      expect(['boy', 'neutral']).toContain(c.gender);
      expect(c.name).not.toBe('Liam');
      expect(c.name).not.toBe('Noah');
      expect(typeof c.popularity).toBe('number');
    }
  });
});

describe('LlmNameProvider', () => {
  it('reports unavailable and yields nothing without credentials', async () => {
    const prevKey = process.env.ANTHROPIC_API_KEY;
    const prevTok = process.env.ANTHROPIC_AUTH_TOKEN;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    try {
      const provider = new LlmNameProvider();
      expect(provider.isAvailable()).toBe(false);
      expect(await provider.propose(baseCtx())).toEqual([]);
    } finally {
      if (prevKey !== undefined) process.env.ANTHROPIC_API_KEY = prevKey;
      if (prevTok !== undefined) process.env.ANTHROPIC_AUTH_TOKEN = prevTok;
    }
  });
});
