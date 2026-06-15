import { useCallback, useEffect, useRef, useState } from 'react';
import { UnauthorizedError } from './adminApi';

/**
 * Loads admin data with shared loading/error handling. A 401 anywhere bounces
 * the operator back to the login via `onUnauthorized`; other errors surface as
 * a message. `reload` re-runs the latest loader on demand.
 */
export function useLoader<T>(
  load: () => Promise<T>,
  onUnauthorized: () => void,
  deps: unknown[] = [],
) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    loadRef
      .current()
      .then(setData)
      .catch((e) => {
        if (e instanceof UnauthorizedError) onUnauthorized();
        else setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(reload, [reload]);

  return { data, error, loading, reload, setData };
}
