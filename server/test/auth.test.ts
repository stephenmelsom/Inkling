import { describe, it, expect, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import { requireAdmin, tokenMatches, isAuthorized } from '../src/admin/auth.js';

afterEach(() => {
  delete process.env.ADMIN_PASSWORD;
});

/** Minimal Response double capturing status + json. */
function mockRes() {
  const out: { code?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      out.code = code;
      return this;
    },
    json(body: unknown) {
      out.body = body;
      return this;
    },
  } as unknown as Response;
  return { res, out };
}

function reqWithToken(token?: string): Request {
  return { header: (name: string) => (name === 'x-admin-token' ? token : undefined) } as unknown as Request;
}

describe('tokenMatches', () => {
  it('is true only for an exact match', () => {
    expect(tokenMatches('hunter2', 'hunter2')).toBe(true);
    expect(tokenMatches('hunter2', 'hunter3')).toBe(false);
    expect(tokenMatches('short', 'longerpassword')).toBe(false);
  });
});

describe('requireAdmin', () => {
  it('returns 503 when ADMIN_PASSWORD is unset (fails closed)', () => {
    const { res, out } = mockRes();
    let nexted = false;
    requireAdmin(reqWithToken('anything'), res, () => {
      nexted = true;
    });
    expect(out.code).toBe(503);
    expect(nexted).toBe(false);
  });

  it('returns 401 for a wrong token', () => {
    process.env.ADMIN_PASSWORD = 'secret';
    const { res, out } = mockRes();
    let nexted = false;
    requireAdmin(reqWithToken('nope'), res, () => {
      nexted = true;
    });
    expect(out.code).toBe(401);
    expect(nexted).toBe(false);
  });

  it('calls next for the correct token', () => {
    process.env.ADMIN_PASSWORD = 'secret';
    const { res } = mockRes();
    let nexted = false;
    requireAdmin(reqWithToken('secret'), res, () => {
      nexted = true;
    });
    expect(nexted).toBe(true);
  });

  it('isAuthorized is false when unconfigured even with a token', () => {
    expect(isAuthorized(reqWithToken('secret'))).toBe(false);
  });
});
