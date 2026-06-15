import { useState } from 'react';
import { login } from './adminApi';

/** The "stage door": a single gilded plate gating the bindery. */
export function AdminLogin({ onAuthed }: { onAuthed: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(password);
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <div className="stage-door">
      <form className="stage-plate" onSubmit={submit}>
        <p className="stage-eyebrow">The bindery</p>
        <h1 className="stage-wordmark">Inkling</h1>
        <p className="stage-lede">Back of house. Mind the wet ink.</p>

        <label className="stage-field">
          <span className="stage-label">Password</span>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </label>

        {error && <p className="stage-error">{error}</p>}

        <button className="stage-submit" type="submit" disabled={busy || !password}>
          {busy ? 'Opening…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
