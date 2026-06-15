import { Router, type Request, type Response } from 'express';

import type { NameProvider, Gender } from '../types.js';
import type { SpellingIndex } from '../dedup/spellingIndex.js';
import { canonicalKey } from '../dedup/canonicalizer.js';
import { familyIdFor } from '../dedup/families.js';
import type { NamesRepo, NameInput } from '../db/namesRepo.js';
import type { FamiliesRepo } from '../db/familiesRepo.js';
import type { EventsRepo } from '../db/eventsRepo.js';
import type { ProviderSettingsRepo } from '../db/providerSettingsRepo.js';
import { adminPassword, requireAdmin, tokenMatches } from './auth.js';

const GENDERS: Gender[] = ['boy', 'girl', 'neutral'];

export interface AdminDeps {
  namesRepo: NamesRepo;
  familiesRepo: FamiliesRepo;
  eventsRepo: EventsRepo;
  providerRepo: ProviderSettingsRepo;
  providers: NameProvider[];
  spellingIndex: SpellingIndex;
  /** Rebuild the live dedup state (families + spelling index) after an edit. */
  refreshDedup: () => void;
}

/** What env each provider needs, surfaced as booleans only — never the values. */
function providerConfig(id: string): { key: string; present: boolean }[] {
  switch (id) {
    case 'llm':
      return [
        {
          key: 'ANTHROPIC_API_KEY',
          present: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
        },
      ];
    case 'external':
      return [{ key: 'NAMEGEN_NAMES_API_URL', present: Boolean(process.env.NAMEGEN_NAMES_API_URL) }];
    default:
      return [];
  }
}

function parseNameInput(body: unknown): NameInput | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (!name) return { error: 'name is required' };
  if (!GENDERS.includes(b.gender as Gender)) return { error: 'gender must be boy|girl|neutral' };
  const count = Number(b.count);
  if (!Number.isFinite(count) || count < 0) return { error: 'count must be a non-negative number' };
  return {
    name,
    gender: b.gender as Gender,
    count: Math.round(count),
    origin: typeof b.origin === 'string' && b.origin.trim() ? b.origin.trim() : undefined,
    meaning: typeof b.meaning === 'string' && b.meaning.trim() ? b.meaning.trim() : undefined,
  };
}

export function createAdminRouter(deps: AdminDeps): Router {
  const router = Router();

  // --- Login (public): validate the shared password so the UI can gate. -----
  router.post('/login', (req: Request, res: Response) => {
    const expected = adminPassword();
    if (!expected) {
      return res.status(503).json({ error: 'Admin panel is not configured.' });
    }
    const password = (req.body ?? {}).password;
    if (typeof password === 'string' && tokenMatches(password, expected)) {
      return res.json({ ok: true });
    }
    return res.status(401).json({ error: "That password doesn't open the bindery." });
  });

  // Everything below requires the admin token.
  router.use(requireAdmin);

  // --- Names dataset --------------------------------------------------------
  router.get('/names', (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    res.json({ names: deps.namesRepo.search(q), total: deps.namesRepo.count() });
  });

  router.post('/names', (req: Request, res: Response) => {
    const parsed = parseNameInput(req.body);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    const created = deps.namesRepo.create(parsed);
    deps.refreshDedup();
    res.status(201).json({ name: created });
  });

  router.put('/names/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
    const parsed = parseNameInput(req.body);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    const updated = deps.namesRepo.update(id, parsed);
    if (!updated) return res.status(404).json({ error: 'name not found' });
    deps.refreshDedup();
    res.json({ name: updated });
  });

  router.delete('/names/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
    const ok = deps.namesRepo.remove(id);
    if (!ok) return res.status(404).json({ error: 'name not found' });
    deps.refreshDedup();
    res.json({ ok: true });
  });

  // --- Variant families -----------------------------------------------------
  router.get('/families', (_req: Request, res: Response) => {
    res.json({ families: deps.familiesRepo.all() });
  });

  router.put('/families/:id', (req: Request, res: Response) => {
    const id = decodeURIComponent(req.params.id).trim();
    if (!id) return res.status(400).json({ error: 'family id is required' });
    const rawMembers = (req.body ?? {}).members;
    if (!Array.isArray(rawMembers)) return res.status(400).json({ error: 'members must be an array' });
    const members = rawMembers
      .filter((m): m is string => typeof m === 'string')
      .map((m) => m.trim())
      .filter(Boolean);
    if (members.length < 2) {
      return res.status(400).json({ error: 'a family needs at least two spellings' });
    }
    const saved = deps.familiesRepo.upsert({ id, members });
    deps.refreshDedup();
    res.json({ family: saved });
  });

  router.delete('/families/:id', (req: Request, res: Response) => {
    const id = decodeURIComponent(req.params.id).trim();
    const ok = deps.familiesRepo.remove(id);
    if (!ok) return res.status(404).json({ error: 'family not found' });
    deps.refreshDedup();
    res.json({ ok: true });
  });

  // --- Providers & health ---------------------------------------------------
  router.get('/providers', async (_req: Request, res: Response) => {
    const providers = await Promise.all(
      deps.providers.map(async (p) => ({
        id: p.id,
        label: p.label,
        available: await p.isAvailable(),
        enabled: deps.providerRepo.isEnabled(p.id),
        config: providerConfig(p.id),
      })),
    );
    res.json({ providers });
  });

  router.put('/providers/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    if (!deps.providers.some((p) => p.id === id)) {
      return res.status(404).json({ error: 'unknown provider' });
    }
    const enabled = (req.body ?? {}).enabled;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be a boolean' });
    deps.providerRepo.setEnabled(id, enabled);
    res.json({ id, enabled });
  });

  // --- Analytics ------------------------------------------------------------
  router.get('/analytics', (_req: Request, res: Response) => {
    res.json(deps.eventsRepo.summary());
  });

  // --- Dedup / collation tester ---------------------------------------------
  router.get('/dedup/test', (req: Request, res: Response) => {
    const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'name is required' });
    const genderParam = req.query.gender;
    const gender = GENDERS.includes(genderParam as Gender) ? (genderParam as Gender) : undefined;
    res.json({
      name,
      gender,
      canonicalKey: canonicalKey(name, gender),
      familyId: familyIdFor(name) ?? null,
      spellings: deps.spellingIndex.variantsOf(name, gender),
    });
  });

  return router;
}
