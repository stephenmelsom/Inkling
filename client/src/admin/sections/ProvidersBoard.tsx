import { useState } from 'react';
import { getProviders, setProvider, type ProviderStatus } from '../adminApi';
import { useLoader } from '../useLoader';

export function ProvidersBoard({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { data, error, loading, reload } = useLoader(getProviders, onUnauthorized);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggle(p: ProviderStatus) {
    setActionError(null);
    setBusyId(p.id);
    try {
      await setProvider(p.id, !p.enabled);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update provider');
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !data) return <p className="muted">Checking the presses…</p>;

  return (
    <div className="providers">
      {actionError && <p className="error-note">{actionError}</p>}
      {error && <p className="error-note">{error}</p>}

      <div className="provider-grid">
        {data?.providers.map((p) => (
          <div className="provider-card" key={p.id}>
            <div className="provider-top">
              <div>
                <h2 className="provider-label">{p.label}</h2>
                <span className="key">{p.id}</span>
              </div>
              <span className={p.available ? 'dot ok' : 'dot off'} title={p.available ? 'available' : 'unavailable'} />
            </div>

            <p className={p.available ? 'provider-state on' : 'provider-state'}>
              {p.available ? 'Available' : 'Unavailable — needs configuration'}
            </p>

            {p.config.length > 0 && (
              <ul className="config-list">
                {p.config.map((c) => (
                  <li key={c.key}>
                    <span className={c.present ? 'check yes' : 'check no'} aria-hidden="true">
                      {c.present ? '✓' : '✕'}
                    </span>
                    <span className="mono config-key">{c.key}</span>
                    <span className="muted">{c.present ? 'set' : 'missing'}</span>
                  </li>
                ))}
              </ul>
            )}

            <button
              className={p.enabled ? 'toggle on' : 'toggle'}
              role="switch"
              aria-checked={p.enabled}
              disabled={busyId === p.id}
              onClick={() => toggle(p)}
            >
              <span className="toggle-track">
                <span className="toggle-knob" />
              </span>
              <span className="toggle-text">{p.enabled ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
