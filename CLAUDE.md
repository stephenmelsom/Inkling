# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (run once after cloning)
npm run install:all

# Dev (run each in a separate terminal)
npm run dev:server    # Express API on :3001
npm run dev:client    # Vite dev server on :5173 (proxies /api → :3001)

# Production build then serve
npm run build         # builds client/dist
npm start             # serves from :3001 (also serves client/dist statically)

# Tests (server only — Vitest)
npm test              # run all tests once
npm --prefix server run test:watch   # watch mode
```

The server is run directly via `tsx` (no compile step needed for dev/test). The client uses Vite + React with TypeScript.

## Architecture

The project is a monorepo with `client/` (React/Vite) and `server/` (Express/TypeScript). Each has its own `package.json`; the root `package.json` is just a task runner.

### Data flow

```
Providers → DeckService → SessionStore → REST API → React client
```

1. **Providers** (`server/src/providers/`) each implement `NameProvider` (defined in `server/src/types.ts`). Three exist: `llmProvider` (Claude API), `externalApiProvider` (SSA dataset), `phoneticProvider` (algorithmic). All are wired up in `providers/registry.ts`. Adding a new provider means implementing `NameProvider` and appending it to `createDefaultProviders()`.

2. **DeckService** (`server/src/deck/deckService.ts`) pulls from all available providers, deduplicates via the canonicalization engine, and maintains a per-session queue. It keeps a queue of 16 cards; it refills when it drops to 6. Interleaving ensures no single provider dominates.

3. **Canonicalization engine** (`server/src/dedup/`) is the core of dedup:
   - `phonetics.ts` — Double Metaphone; same-sounding spellings → same code
   - `families.ts` — curated overrides for nickname families (`Elizabeth`/`Beth`/`Eliza`) and phonetics edge cases; **extend here when phonetic grouping is wrong**
   - `canonicalizer.ts` — family id → phonetic key resolution (family takes precedence)
   - `spellingIndex.ts` — groups all known spellings by canonical key; answers "representative spelling" and "all spellings of this group"

4. **SessionStore** (`server/src/session/store.ts`) is in-memory (Map of sessions). Each session holds `queue`, `likes`, `seenKeys`, `dislikedKeys`, and `cardsById`.

5. **Client** (`client/src/`) is vanilla React with no state library. `api.ts` wraps all fetch calls. `App.tsx` holds session/swipe state; `SwipeCard.tsx` handles drag-gesture UX; `LikedPanel.tsx` shows spellings of liked names.

### Key invariant

The deck guarantees a user never sees the same canonical group twice per session. `canonicalKey()` is the identity function — if it returns the same string for two names, they are the same name.

## Configuration

| Env var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` | Enables the LLM provider |
| `NAMEGEN_LLM_MODEL` | Override Claude model (default `claude-opus-4-8`) |
| `NAMEGEN_NAMES_API_URL` | Live names endpoint for external provider (`[{name,gender,count}]`) |
| `PORT` | Server port (default `3001`) |

## Tests

Tests live in `server/test/` and are run with Vitest:
- `dedup.test.ts` — canonicalization engine unit tests
- `deck.test.ts` — deck dedup invariant
- `providers.test.ts` — provider contract tests
