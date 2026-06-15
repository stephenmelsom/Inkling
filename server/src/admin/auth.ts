import { timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Simple shared-password gate for the admin panel. The operator sets
 * `ADMIN_PASSWORD`; the client sends it back as an `x-admin-token` header on
 * every admin request. We compare with a constant-time check so a wrong guess
 * can't be timed.
 *
 * If `ADMIN_PASSWORD` is unset the admin surface fails closed (503) rather than
 * opening unprotected — an unconfigured bindery stays locked.
 */

export function adminPassword(): string | undefined {
  const pw = process.env.ADMIN_PASSWORD;
  return pw && pw.length > 0 ? pw : undefined;
}

/** Constant-time string compare that tolerates differing lengths. */
export function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still do a comparison to keep timing uniform, then fail.
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

/** True if the request carries the correct admin token. */
export function isAuthorized(req: Request): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  const provided = req.header('x-admin-token');
  return typeof provided === 'string' && tokenMatches(provided, expected);
}

/** Express middleware: 503 if admin is unconfigured, 401 if the token is wrong. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!adminPassword()) {
    res.status(503).json({ error: 'Admin panel is not configured. Set ADMIN_PASSWORD to enable it.' });
    return;
  }
  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'Not authorized' });
    return;
  }
  next();
}
