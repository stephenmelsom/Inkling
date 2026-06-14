import type { NameProvider } from '../types.js';
import { LlmNameProvider } from './llmProvider.js';
import { ExternalApiNameProvider } from './externalApiProvider.js';
import { PhoneticNameProvider } from './phoneticProvider.js';

/**
 * The set of name-proposal systems the deck draws from. Adding a new proposal
 * system is as simple as implementing `NameProvider` and listing it here —
 * the deck handles aggregation and dedup uniformly.
 */
export function createDefaultProviders(): NameProvider[] {
  return [
    new LlmNameProvider(),
    new ExternalApiNameProvider(),
    new PhoneticNameProvider(),
  ];
}
