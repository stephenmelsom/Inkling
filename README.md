# BabyNamer

A baby-name generator with a Tinder-style "swipe right" UX. Names are sourced
from **multiple pluggable proposal systems**, deduplicated so you never see the
same name spelled (or nicknamed) two different ways, and — once you like a name —
expanded into its **common spellings**.

```
┌──────────────┐   candidates   ┌───────────────────┐   distinct cards   ┌──────────┐
│  Providers   │ ─────────────▶ │  Canonicalization │ ─────────────────▶ │  Swipe   │
│ LLM/API/algo │                │  + dedup engine   │                    │  deck    │
└──────────────┘                └───────────────────┘                    └──────────┘
                                         │  like ──▶ common spellings of the group
```

## How it meets the requirements

| Requirement | How it's implemented |
|---|---|
| **Tinder-style swipe UX** | React card stack with drag gestures + ✕/♥ buttons (`client/src/components/SwipeCard.tsx`). |
| **Integrate multiple name-proposal systems** | A `NameProvider` interface (`server/src/types.ts`) with three implementations; add more by dropping them into `providers/registry.ts`. |
| **Names should be semantically different** | The deck never serves two cards from the same *canonical group*. Spelling variants **and** nickname/diminutive families collapse to one group. |
| **Never show the same name spelled multiple ways** | Spelling variants share a phonetic key (Double Metaphone); curated families handle the rest. Only the most common spelling is shown. |
| **Review common spellings of a liked name** | Liking a name expands it into the popularity-ranked spellings of its group (`SpellingIndex`). |

## Architecture

### Name-proposal providers (`server/src/providers/`)

All implement the same `NameProvider` interface and are aggregated by the deck.
A provider that can't run (no credentials, network blocked) simply contributes
nothing — the others carry on.

- **`llm`** — asks a Claude model (`claude-opus-4-8` by default) for names tuned
  to your likes/dislikes, instructed to keep proposals semantically distinct.
  Requires `ANTHROPIC_API_KEY` (or `ANTHROPIC_AUTH_TOKEN`).
- **`external`** — real, popularity-ranked names. Samples a bundled SSA-style
  dataset offline; if `NAMEGEN_NAMES_API_URL` is set it pulls a live list first
  (the hook for the US SSA dataset or any public names API) and falls back to the
  bundle on error.
- **`phonetic`** — generates novel, pronounceable names from phonotactic building
  blocks and blends of names you've liked. Fully offline, always available.

### Canonicalization & dedup (`server/src/dedup/`)

The heart of "semantically different" and "no duplicate spellings":

1. **`phonetics.ts`** — Double Metaphone maps same-sounding spellings to the same
   code (`Catherine`/`Katherine`/`Kathryn` → `K0RN`).
2. **`families.ts`** — curated variant families override phonetics, both to fix
   edge cases and to group nickname families that *don't* sound alike
   (`Elizabeth`/`Eliza`/`Beth`). Easy to extend.
3. **`canonicalizer.ts`** — resolves any name to a `canonicalKey`: a family id if
   known, else a gender-scoped phonetic key.
4. **`spellingIndex.ts`** — groups every known spelling by canonical key to answer
   "what's the most common spelling?" (the card you see) and "what are the common
   spellings?" (the liked-name detail view).

### Deck (`server/src/deck/deckService.ts`)

Gathers candidates from every available provider, interleaves them, drops anything
whose canonical key was already seen / liked / disliked, swaps in the
representative spelling, and serves cards one at a time.

## API

| Method & path | Purpose |
|---|---|
| `GET /api/providers` | List providers and which are currently available. |
| `POST /api/sessions` | Start a session. Body: `{ "gender": "boy"\|"girl"\|"neutral" }` (optional). |
| `GET /api/sessions/:id/next` | Next card (or `{ "card": null }` when exhausted). |
| `POST /api/sessions/:id/swipe` | Body: `{ "cardId": "...", "direction": "like"\|"dislike" }`. |
| `GET /api/sessions/:id/liked` | Liked names, each with `spellings` (common spellings, ranked). |

## Running it

```bash
npm run install:all          # install server + client deps

# Dev (two terminals): API on :3001, Vite UI on :5173 (proxies /api)
npm run dev:server
npm run dev:client

# Production-style: build the client, then the server serves it from :3001
npm run build
npm start                    # open http://localhost:3001
```

Tests (dedup engine, deck dedup invariant, providers):

```bash
npm test
```

### Configuration

| Env var | Effect |
|---|---|
| `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` | Enables the LLM provider. |
| `NAMEGEN_LLM_MODEL` | Override the Claude model (default `claude-opus-4-8`). |
| `NAMEGEN_NAMES_API_URL` | Live names endpoint for the external provider (`[{name,gender,count}]`). |
| `PORT` | Server port (default `3001`). |

## Notes & limitations

- Sessions are in-memory (single-process). Swap `SessionStore` for a persistent
  store to scale out.
- Phonetic auto-grouping is a heuristic; it can occasionally over-merge
  sound-alikes that are arguably different names. The curated family layer exists
  to correct the cases that matter and always takes precedence — extend it in
  `families.ts`.
