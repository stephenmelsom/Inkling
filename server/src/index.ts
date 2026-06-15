import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import { SEED_NAMES } from './data/names.js';
import { SpellingIndex } from './dedup/spellingIndex.js';
import { createDefaultProviders } from './providers/registry.js';
import { DeckService } from './deck/deckService.js';
import { SessionStore } from './session/store.js';
import type { Gender, SwipeDirection } from './types.js';

const spellingIndex = new SpellingIndex(SEED_NAMES);
const providers = createDefaultProviders();
const deck = new DeckService(providers, spellingIndex);
const store = new SessionStore();

const app = express();
app.use(cors());
app.use(express.json());

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
  const ok = deck.swipe(session, cardId, direction as SwipeDirection);
  if (!ok) return res.status(404).json({ error: 'card not found in session' });
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
