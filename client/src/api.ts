import type { DeckCard, Gender, LikedName, ProviderInfo } from './types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function getProviders(): Promise<ProviderInfo> {
  return json(await fetch('/api/providers'));
}

export async function createSession(gender?: Gender): Promise<{ sessionId: string }> {
  return json(
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender }),
    }),
  );
}

export async function getNext(sessionId: string): Promise<{ card: DeckCard | null }> {
  return json(await fetch(`/api/sessions/${sessionId}/next`));
}

export async function swipe(
  sessionId: string,
  cardId: string,
  direction: 'like' | 'dislike',
): Promise<{ ok: boolean; likedCount: number }> {
  return json(
    await fetch(`/api/sessions/${sessionId}/swipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, direction }),
    }),
  );
}

export async function getLiked(sessionId: string): Promise<{ liked: LikedName[] }> {
  return json(await fetch(`/api/sessions/${sessionId}/liked`));
}
