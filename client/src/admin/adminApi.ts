import type { Gender, SpellingVariant } from '../types';

const TOKEN_KEY = 'inkling-admin-token';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Thrown when the server rejects the token — the UI bounces back to login. */
export class UnauthorizedError extends Error {}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-admin-token': token } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401) {
    clearToken();
    throw new UnauthorizedError('Not authorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// --- Auth -------------------------------------------------------------------
export async function login(password: string): Promise<void> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? 'Login failed');
  }
  setToken(password);
}

// --- Names ------------------------------------------------------------------
export interface StoredName {
  id: number;
  name: string;
  gender: Gender;
  count: number;
  origin?: string;
  meaning?: string;
}
export interface NameInput {
  name: string;
  gender: Gender;
  count: number;
  origin?: string;
  meaning?: string;
}

export function getNames(q?: string): Promise<{ names: StoredName[]; total: number }> {
  return request(`/names${q ? `?q=${encodeURIComponent(q)}` : ''}`);
}
export function createName(input: NameInput): Promise<{ name: StoredName }> {
  return request('/names', { method: 'POST', body: JSON.stringify(input) });
}
export function updateName(id: number, input: NameInput): Promise<{ name: StoredName }> {
  return request(`/names/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}
export function deleteName(id: number): Promise<{ ok: boolean }> {
  return request(`/names/${id}`, { method: 'DELETE' });
}

// --- Families ---------------------------------------------------------------
export interface VariantFamily {
  id: string;
  members: string[];
}
export function getFamilies(): Promise<{ families: VariantFamily[] }> {
  return request('/families');
}
export function saveFamily(family: VariantFamily): Promise<{ family: VariantFamily }> {
  return request(`/families/${encodeURIComponent(family.id)}`, {
    method: 'PUT',
    body: JSON.stringify({ members: family.members }),
  });
}
export function deleteFamily(id: string): Promise<{ ok: boolean }> {
  return request(`/families/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// --- Providers --------------------------------------------------------------
export interface ProviderStatus {
  id: string;
  label: string;
  available: boolean;
  enabled: boolean;
  config: { key: string; present: boolean }[];
}
export function getProviders(): Promise<{ providers: ProviderStatus[] }> {
  return request('/providers');
}
export function setProvider(id: string, enabled: boolean): Promise<{ id: string; enabled: boolean }> {
  return request(`/providers/${id}`, { method: 'PUT', body: JSON.stringify({ enabled }) });
}

// --- Analytics --------------------------------------------------------------
export interface NameTally {
  canonicalKey: string;
  name: string;
  keeps: number;
  passes: number;
  keepRate: number;
}
export interface ProviderTally {
  source: string;
  keeps: number;
  passes: number;
}
export interface Analytics {
  totalSwipes: number;
  totalKeeps: number;
  totalPasses: number;
  sessions: number;
  keepRate: number;
  topKept: NameTally[];
  topPassed: NameTally[];
  byProvider: ProviderTally[];
}
export function getAnalytics(): Promise<Analytics> {
  return request('/analytics');
}

// --- Dedup tester -----------------------------------------------------------
export interface DedupResult {
  name: string;
  gender?: Gender;
  canonicalKey: string;
  familyId: string | null;
  spellings: SpellingVariant[];
}
export function testDedup(name: string, gender?: Gender): Promise<DedupResult> {
  const params = new URLSearchParams({ name });
  if (gender) params.set('gender', gender);
  return request(`/dedup/test?${params.toString()}`);
}
