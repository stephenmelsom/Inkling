import Anthropic from '@anthropic-ai/sdk';
import type { Gender, NameCandidate, NameProvider, ProposalContext } from '../types.js';

/**
 * LLM-based provider. Asks a Claude model to propose names tailored to the
 * user's likes/dislikes, with an explicit instruction to keep proposals
 * semantically distinct from each other and from names already seen.
 *
 * Unavailable without Anthropic credentials; when unavailable (or on any API
 * error) it simply contributes nothing and the deck draws on the other
 * providers. Uses structured outputs so we get a clean, parseable name list.
 */

const DEFAULT_MODEL = process.env.NAMEGEN_LLM_MODEL ?? 'claude-opus-4-8';

interface LlmName {
  name: string;
  gender: Gender;
  origin: string;
  meaning: string;
}

export class LlmNameProvider implements NameProvider {
  id = 'llm';
  label = 'AI generator';

  private client: Anthropic | null = null;

  private hasCredentials(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  }

  isAvailable(): boolean {
    return this.hasCredentials();
  }

  private getClient(): Anthropic {
    if (!this.client) this.client = new Anthropic();
    return this.client;
  }

  async propose(ctx: ProposalContext): Promise<NameCandidate[]> {
    if (!this.hasCredentials()) return [];

    const genderLine = ctx.gender
      ? `Only propose ${ctx.gender} names.`
      : 'Propose a mix of boy, girl, and gender-neutral names.';
    const likedLine = ctx.liked.length
      ? `The user has LIKED these names: ${ctx.liked.join(', ')}. Propose names with a similar feel, but do not repeat them or offer mere spelling/nickname variants of them.`
      : 'The user has not liked any names yet.';
    const profileLine = ctx.profile?.summary
      ? `Their taste so far leans toward: ${ctx.profile.summary}. Favour names that fit this profile.`
      : '';
    const dislikedLine = ctx.disliked.length
      ? `The user has REJECTED these names (avoid them and anything close to them): ${ctx.disliked.join(', ')}.`
      : '';

    const prompt = [
      `Propose ${ctx.count} baby names.`,
      genderLine,
      likedLine,
      profileLine,
      dislikedLine,
      'Hard requirements:',
      '- Every name must be SEMANTICALLY DISTINCT from the others — no two names that are spelling variants, nicknames, or diminutives of the same underlying name.',
      '- Prefer real, usable given names over invented ones.',
      '- For each name give its cultural origin and a short meaning.',
      '',
      'Respond with ONLY a JSON object, no prose or code fences, of the form:',
      '{"names":[{"name":"...","gender":"boy|girl|neutral","origin":"...","meaning":"..."}]}',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await this.getClient().messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      if (response.stop_reason === 'refusal') return [];

      const text = response.content.find((b) => b.type === 'text');
      if (!text || text.type !== 'text') return [];

      const parsed = JSON.parse(stripToJson(text.text)) as { names?: LlmName[] };
      if (!parsed.names) return [];

      return parsed.names.map((n) => ({
        name: n.name,
        gender: n.gender,
        origin: n.origin,
        meaning: n.meaning,
        source: this.id,
      }));
    } catch {
      return []; // no credentials, network blocked, malformed output — degrade quietly
    }
  }
}

/** Pull a JSON object out of a model response, tolerating code fences/prose. */
function stripToJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  return start !== -1 && end > start ? body.slice(start, end + 1) : body;
}
