import type { NameProvider } from '../types.js';
import type { NameRecord } from '../data/names.js';
import { LlmNameProvider } from './llmProvider.js';
import { ExternalApiNameProvider } from './externalApiProvider.js';
import { PhoneticNameProvider } from './phoneticProvider.js';

export interface ProviderOptions {
  /** Offline names source for the External provider (defaults to the bundled seed). */
  namesSource?: () => NameRecord[];
}

/**
 * The set of name-proposal systems the deck draws from. Adding a new proposal
 * system is as simple as implementing `NameProvider` and listing it here —
 * the deck handles aggregation and dedup uniformly.
 */
export function createDefaultProviders(opts: ProviderOptions = {}): NameProvider[] {
  return [
    new LlmNameProvider(),
    new ExternalApiNameProvider(opts.namesSource),
    new PhoneticNameProvider(),
  ];
}
