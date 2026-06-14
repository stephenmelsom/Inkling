export type Gender = 'boy' | 'girl' | 'neutral';

export interface DeckCard {
  id: string;
  name: string;
  gender?: Gender;
  origin?: string;
  meaning?: string;
  source: string;
  canonicalKey: string;
}

export interface SpellingVariant {
  name: string;
  popularity: number;
  primary: boolean;
}

export interface LikedName {
  cardId: string;
  name: string;
  gender?: Gender;
  origin?: string;
  meaning?: string;
  source: string;
  canonicalKey: string;
  spellings: SpellingVariant[];
}

export interface ProviderInfo {
  providers: { id: string; label: string }[];
  available: string[];
}
