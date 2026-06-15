import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import { SpellingIndex } from './dedup/spellingIndex.js';
import { reloadFamilies } from './dedup/families.js';
import { createDefaultProviders } from './providers/registry.js';
import { DeckService } from './deck/deckService.js';
import { SessionStore } from './session/store.js';
import { openDb } from './db/db.js';
import { NamesRepo } from './db/namesRepo.js';
import { FamiliesRepo } from './db/familiesRepo.js';
import { EventsRepo } from './db/eventsRepo.js';
import { ProviderSettingsRepo } from './db/providerSettingsRepo.js';
import { createAdminRouter } from './admin/routes.js';
import type { Gender, SwipeDirection } from './types.js';

// --- Persistence: database + repositories -----------------------------------
const db = openDb();
const namesRepo = new NamesRepo(db);
const familiesRepo = new FamiliesRepo(db);
const eventsRepo = new EventsRepo(db);
const providerRepo = new ProviderSettingsRepo(db);

// Load the curated families from the database (seeded on first boot) into the
// live dedup engine, and build the spelling index from the stored names.
reloadFamilies(familiesRepo.all());
const spellingIndex = new SpellingIndex(namesRepo.all());

/** Rebuild live dedup state after the admin panel edits names or families. */
function refreshDedup(): void {
  reloadFamilies(familiesRepo.all());
  spellingIndex.rebuild(namesRepo.all());
}

const providers = createDefaultProviders({ namesSource: () => namesRepo.all() });
for (const p of providers) providerRepo.ensure(p.id);
const deck = new DeckService(providers, spellingIndex, (id) => providerRepo.isEnabled(id));
const store = new SessionStore();

const app = express();
app.use(cors());
app.use(express.json());

app.use(
  '/api/admin',
  createAdminRouter({
    namesRepo,
    familiesRepo,
    eventsRepo,
    providerRepo,
    providers,
    spellingIndex,
    refreshDedup,
  }),
);

const GENDERS: Gender[] = ['boy', 'girl', 'neutral'];

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/api/providers', async (_req: Request, res: Response) => {
  res.json({
    providers: providers.map((p) => ({ id: p.id, label: p.label })),
    available: await deck.availableProviders(),
  });
});

app.post('/api/sessions', (req: Request, res: Response) => {
  const gender = req.body?.gender as unknown;
  if (gender !== undefined && !GENDERS.includes(gender as Gender)) {
    return res.status(400).json({ error: 'gender must be one of boy|girl|neutral' });
  }
  const session = store.create(gender as Gender | undefined);
  res.json({ sessionId: session.id, gender: session.gender });
});

app.get('/api/sessions/:id/next', async (req: Request, res: Response) => {
  const session = store.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'session not found' });
  const card = await deck.next(session);
  res.json({ card });
});

app.post('/api/sessions/:id/swipe', (req: Request, res: Response) => {
  const session = store.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'session not found' });

  const { cardId, direction } = req.body ?? {};
  if (typeof cardId !== 'string' || (direction !== 'like' && direction !== 'dislike')) {
    return res.status(400).json({ error: 'expected { cardId: string, direction: like|dislike }' });
  }
  const card = session.cardsById.get(cardId);
  const ok = deck.swipe(session, cardId, direction as SwipeDirection);
  if (!ok) return res.status(404).json({ error: 'card not found in session' });

  // Record the swipe for aggregate analytics (anonymous: no PII, just the name).
  if (card) {
    eventsRepo.record({
      sessionId: session.id,
      canonicalKey: card.canonicalKey,
      name: card.name,
      gender: card.gender,
      source: card.source,
      direction: direction as SwipeDirection,
    });
  }
  res.json({ ok: true, likedCount: session.likes.length });
});

app.get('/api/sessions/:id/liked', (req: Request, res: Response) => {
  const session = store.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'session not found' });
  res.json({ liked: deck.likedNames(session) });
});

// Serve the built client if present (single-server production deployment).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`Inkling server listening on http://localhost:${PORT}`);
});
