import type { Gender } from '../types.js';

/**
 * A row of real-world names data: spelling, gender, and a popularity weight
 * (loosely modelled on US SSA birth counts, scaled down). This dataset is the
 * offline data layer behind two things:
 *   - the External names provider (samples popular real names), and
 *   - the spelling-variant index (groups spellings so we can show a name's
 *     "common spellings" once it's liked).
 *
 * It deliberately includes dense spelling clusters (Catherine/Katherine/...,
 * Aiden/Aidan/Ayden, Sophia/Sofia, ...) so the canonicalization engine has
 * something real to collapse. The live External provider can replace/augment
 * this with the full SSA dataset when the network allows.
 */
export interface NameRecord {
  name: string;
  gender: Gender;
  /** Relative popularity (higher = more common). */
  count: number;
  origin?: string;
  meaning?: string;
}

export const SEED_NAMES: NameRecord[] = [
  // --- Catherine cluster ---
  { name: 'Catherine', gender: 'girl', count: 9200, origin: 'Greek', meaning: 'pure' },
  { name: 'Katherine', gender: 'girl', count: 11800, origin: 'Greek', meaning: 'pure' },
  { name: 'Kathryn', gender: 'girl', count: 4300, origin: 'Greek', meaning: 'pure' },
  { name: 'Katharine', gender: 'girl', count: 900, origin: 'Greek', meaning: 'pure' },
  { name: 'Catharine', gender: 'girl', count: 210, origin: 'Greek', meaning: 'pure' },

  // --- Aiden cluster ---
  { name: 'Aiden', gender: 'boy', count: 14200, origin: 'Irish', meaning: 'little fire' },
  { name: 'Aidan', gender: 'boy', count: 5400, origin: 'Irish', meaning: 'little fire' },
  { name: 'Ayden', gender: 'boy', count: 3900, origin: 'Irish', meaning: 'little fire' },
  { name: 'Aden', gender: 'boy', count: 1400, origin: 'Irish', meaning: 'little fire' },
  { name: 'Adan', gender: 'boy', count: 1100, origin: 'Spanish', meaning: 'little fire' },

  // --- Sophia cluster ---
  { name: 'Sophia', gender: 'girl', count: 19800, origin: 'Greek', meaning: 'wisdom' },
  { name: 'Sofia', gender: 'girl', count: 12600, origin: 'Greek', meaning: 'wisdom' },
  { name: 'Sophie', gender: 'girl', count: 6100, origin: 'Greek', meaning: 'wisdom' },
  { name: 'Sofie', gender: 'girl', count: 520, origin: 'Greek', meaning: 'wisdom' },

  // --- Sarah cluster ---
  { name: 'Sarah', gender: 'girl', count: 12400, origin: 'Hebrew', meaning: 'princess' },
  { name: 'Sara', gender: 'girl', count: 5200, origin: 'Hebrew', meaning: 'princess' },

  // --- Caitlin cluster ---
  { name: 'Kaitlyn', gender: 'girl', count: 6700, origin: 'Irish', meaning: 'pure' },
  { name: 'Katelyn', gender: 'girl', count: 5300, origin: 'Irish', meaning: 'pure' },
  { name: 'Caitlin', gender: 'girl', count: 2800, origin: 'Irish', meaning: 'pure' },
  { name: 'Caitlyn', gender: 'girl', count: 2100, origin: 'Irish', meaning: 'pure' },
  { name: 'Katelynn', gender: 'girl', count: 1500, origin: 'Irish', meaning: 'pure' },

  // --- Isabel cluster ---
  { name: 'Isabella', gender: 'girl', count: 17600, origin: 'Hebrew', meaning: 'pledged to God' },
  { name: 'Isabel', gender: 'girl', count: 5100, origin: 'Hebrew', meaning: 'pledged to God' },
  { name: 'Isabelle', gender: 'girl', count: 4200, origin: 'Hebrew', meaning: 'pledged to God' },
  { name: 'Izabella', gender: 'girl', count: 1300, origin: 'Hebrew', meaning: 'pledged to God' },

  // --- Madeline cluster ---
  { name: 'Madeline', gender: 'girl', count: 7200, origin: 'Greek', meaning: 'high tower' },
  { name: 'Madelyn', gender: 'girl', count: 6600, origin: 'Greek', meaning: 'high tower' },
  { name: 'Madeleine', gender: 'girl', count: 1900, origin: 'French', meaning: 'high tower' },
  { name: 'Madalyn', gender: 'girl', count: 700, origin: 'Greek', meaning: 'high tower' },

  // --- Jackson cluster ---
  { name: 'Jackson', gender: 'boy', count: 13300, origin: 'English', meaning: 'son of Jack' },
  { name: 'Jaxon', gender: 'boy', count: 7800, origin: 'English', meaning: 'son of Jack' },
  { name: 'Jaxson', gender: 'boy', count: 4100, origin: 'English', meaning: 'son of Jack' },
  { name: 'Jaxton', gender: 'boy', count: 1600, origin: 'English', meaning: "Jack's town" },

  // --- Muhammad cluster ---
  { name: 'Muhammad', gender: 'boy', count: 4600, origin: 'Arabic', meaning: 'praiseworthy' },
  { name: 'Mohammed', gender: 'boy', count: 2300, origin: 'Arabic', meaning: 'praiseworthy' },
  { name: 'Mohamed', gender: 'boy', count: 1700, origin: 'Arabic', meaning: 'praiseworthy' },
  { name: 'Muhammed', gender: 'boy', count: 900, origin: 'Arabic', meaning: 'praiseworthy' },

  // --- Hailey cluster ---
  { name: 'Hailey', gender: 'girl', count: 6900, origin: 'English', meaning: 'hay meadow' },
  { name: 'Haley', gender: 'girl', count: 3100, origin: 'English', meaning: 'hay meadow' },
  { name: 'Haylee', gender: 'girl', count: 2400, origin: 'English', meaning: 'hay meadow' },
  { name: 'Hayley', gender: 'girl', count: 2000, origin: 'English', meaning: 'hay meadow' },

  // --- Zoe cluster ---
  { name: 'Zoe', gender: 'girl', count: 8100, origin: 'Greek', meaning: 'life' },
  { name: 'Zoey', gender: 'girl', count: 7300, origin: 'Greek', meaning: 'life' },
  { name: 'Zoie', gender: 'girl', count: 600, origin: 'Greek', meaning: 'life' },

  // --- Caleb cluster ---
  { name: 'Caleb', gender: 'boy', count: 9100, origin: 'Hebrew', meaning: 'devotion to God' },
  { name: 'Kaleb', gender: 'boy', count: 2200, origin: 'Hebrew', meaning: 'devotion to God' },

  // --- Elizabeth nickname family (semantic, handled by curated families) ---
  { name: 'Elizabeth', gender: 'girl', count: 14100, origin: 'Hebrew', meaning: 'pledged to God' },
  { name: 'Eliza', gender: 'girl', count: 3500, origin: 'Hebrew', meaning: 'pledged to God' },
  { name: 'Beth', gender: 'girl', count: 900, origin: 'Hebrew', meaning: 'pledged to God' },
  { name: 'Liza', gender: 'girl', count: 400, origin: 'Hebrew', meaning: 'pledged to God' },
  { name: 'Lizbeth', gender: 'girl', count: 350, origin: 'Hebrew', meaning: 'pledged to God' },

  // --- Other popular standalone names (varied origins) ---
  { name: 'Olivia', gender: 'girl', count: 18900, origin: 'Latin', meaning: 'olive tree' },
  { name: 'Emma', gender: 'girl', count: 17200, origin: 'Germanic', meaning: 'whole, universal' },
  { name: 'Charlotte', gender: 'girl', count: 13700, origin: 'French', meaning: 'free man' },
  { name: 'Amelia', gender: 'girl', count: 12900, origin: 'Germanic', meaning: 'work' },
  { name: 'Ava', gender: 'girl', count: 12800, origin: 'Latin', meaning: 'bird' },
  { name: 'Mia', gender: 'girl', count: 11200, origin: 'Italian', meaning: 'mine' },
  { name: 'Evelyn', gender: 'girl', count: 9800, origin: 'English', meaning: 'wished-for child' },
  { name: 'Harper', gender: 'girl', count: 8700, origin: 'English', meaning: 'harp player' },
  { name: 'Luna', gender: 'girl', count: 8400, origin: 'Latin', meaning: 'moon' },
  { name: 'Camila', gender: 'girl', count: 7100, origin: 'Latin', meaning: 'young ceremonial attendant' },
  { name: 'Gianna', gender: 'girl', count: 5600, origin: 'Italian', meaning: 'God is gracious' },
  { name: 'Aurora', gender: 'girl', count: 5300, origin: 'Latin', meaning: 'dawn' },
  { name: 'Penelope', gender: 'girl', count: 5200, origin: 'Greek', meaning: 'weaver' },
  { name: 'Nora', gender: 'girl', count: 5000, origin: 'Irish', meaning: 'honour' },
  { name: 'Hazel', gender: 'girl', count: 4900, origin: 'English', meaning: 'the hazel tree' },
  { name: 'Aria', gender: 'girl', count: 4700, origin: 'Italian', meaning: 'air, melody' },
  { name: 'Scarlett', gender: 'girl', count: 4600, origin: 'English', meaning: 'scarlet' },
  { name: 'Ruby', gender: 'girl', count: 3900, origin: 'Latin', meaning: 'red gemstone' },
  { name: 'Maya', gender: 'girl', count: 3800, origin: 'Sanskrit', meaning: 'illusion' },
  { name: 'Willow', gender: 'girl', count: 3600, origin: 'English', meaning: 'willow tree' },
  { name: 'Naomi', gender: 'girl', count: 3400, origin: 'Hebrew', meaning: 'pleasantness' },
  { name: 'Freya', gender: 'girl', count: 2700, origin: 'Norse', meaning: 'noble lady' },
  { name: 'Ada', gender: 'girl', count: 1600, origin: 'Germanic', meaning: 'nobility' },
  { name: 'Ingrid', gender: 'girl', count: 700, origin: 'Norse', meaning: "beautiful, Ing's ride" },

  { name: 'Liam', gender: 'boy', count: 20300, origin: 'Irish', meaning: 'strong-willed warrior' },
  { name: 'Noah', gender: 'boy', count: 18100, origin: 'Hebrew', meaning: 'rest, comfort' },
  { name: 'Oliver', gender: 'boy', count: 14400, origin: 'Latin', meaning: 'olive tree' },
  { name: 'Elijah', gender: 'boy', count: 12800, origin: 'Hebrew', meaning: 'Yahweh is God' },
  { name: 'Mateo', gender: 'boy', count: 11900, origin: 'Spanish', meaning: 'gift of God' },
  { name: 'Lucas', gender: 'boy', count: 11200, origin: 'Latin', meaning: 'bringer of light' },
  { name: 'Levi', gender: 'boy', count: 9700, origin: 'Hebrew', meaning: 'joined, attached' },
  { name: 'Ezra', gender: 'boy', count: 8300, origin: 'Hebrew', meaning: 'help' },
  { name: 'Asher', gender: 'boy', count: 8100, origin: 'Hebrew', meaning: 'happy, blessed' },
  { name: 'Leo', gender: 'boy', count: 7600, origin: 'Latin', meaning: 'lion' },
  { name: 'Ezekiel', gender: 'boy', count: 4200, origin: 'Hebrew', meaning: 'God strengthens' },
  { name: 'Silas', gender: 'boy', count: 4100, origin: 'Latin', meaning: 'of the forest' },
  { name: 'Theodore', gender: 'boy', count: 9300, origin: 'Greek', meaning: 'gift of God' },
  { name: 'Atlas', gender: 'boy', count: 2900, origin: 'Greek', meaning: 'to carry, endure' },
  { name: 'Felix', gender: 'boy', count: 2600, origin: 'Latin', meaning: 'happy, fortunate' },
  { name: 'Soren', gender: 'boy', count: 1700, origin: 'Danish', meaning: 'stern' },
  { name: 'Idris', gender: 'boy', count: 1200, origin: 'Welsh/Arabic', meaning: 'ardent lord; studious' },
  { name: 'Kai', gender: 'boy', count: 5400, origin: 'Hawaiian', meaning: 'sea' },
  { name: 'Arlo', gender: 'boy', count: 3300, origin: 'English', meaning: 'fortified hill' },
  { name: 'Cyrus', gender: 'boy', count: 1500, origin: 'Persian', meaning: 'sun' },

  // --- Gender-neutral names ---
  { name: 'Riley', gender: 'neutral', count: 7400, origin: 'Irish', meaning: 'courageous' },
  { name: 'Avery', gender: 'neutral', count: 6800, origin: 'English', meaning: 'ruler of elves' },
  { name: 'Rowan', gender: 'neutral', count: 4500, origin: 'Irish', meaning: 'little redhead; rowan tree' },
  { name: 'Sage', gender: 'neutral', count: 3200, origin: 'Latin', meaning: 'wise; the herb' },
  { name: 'River', gender: 'neutral', count: 3000, origin: 'English', meaning: 'flowing water' },
  { name: 'Quinn', gender: 'neutral', count: 2900, origin: 'Irish', meaning: 'descendant of Conn' },
  { name: 'Phoenix', gender: 'neutral', count: 2700, origin: 'Greek', meaning: 'dark red; the firebird' },
  { name: 'Emerson', gender: 'neutral', count: 2500, origin: 'English', meaning: "son of Emery" },
  { name: 'Finley', gender: 'neutral', count: 2300, origin: 'Scottish', meaning: 'fair-haired hero' },
  { name: 'Reese', gender: 'neutral', count: 1400, origin: 'Welsh', meaning: 'ardour' },
];
