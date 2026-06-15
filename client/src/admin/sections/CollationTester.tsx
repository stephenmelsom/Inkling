import { useEffect, useState } from 'react';
import { testDedup, UnauthorizedError, type DedupResult } from '../adminApi';
import { IlluminatedName } from '../../components/IlluminatedName';
import type { Gender } from '../../types';

type GenderChoice = 'any' | Gender;
const CHOICES: { id: GenderChoice; label: string }[] = [
  { id: 'any', label: 'Any' },
  { id: 'girl', label: 'Girl' },
  { id: 'boy', label: 'Boy' },
  { id: 'neutral', label: 'Neutral' },
];

/**
 * The bindery's signature: type a name and watch it resolve to its canonical
 * key while the spelling family it belongs to fans out onto the stone. It's the
 * product's dedup magic, made visible and diagnostic.
 */
export function CollationTester({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<GenderChoice>('any');
  const [result, setResult] = useState<DedupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setResult(null);
      setError(null);
      return;
    }
    setPending(true);
    const t = setTimeout(() => {
      testDedup(trimmed, gender === 'any' ? undefined : gender)
        .then((r) => {
          setResult(r);
          setError(null);
        })
        .catch((e) => {
          if (e instanceof UnauthorizedError) onUnauthorized();
          else setError(e instanceof Error ? e.message : 'Lookup failed');
        })
        .finally(() => setPending(false));
    }, 250);
    return () => clearTimeout(t);
  }, [name, gender, onUnauthorized]);

  const curated = result?.familyId != null;

  return (
    <div className="collation">
      <div className="stone">
        <input
          className="stone-input"
          placeholder="Set a name on the stone…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="seg" role="radiogroup" aria-label="Gender scope">
          {CHOICES.map((c) => (
            <button
              key={c.id}
              role="radio"
              aria-checked={gender === c.id}
              className={gender === c.id ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setGender(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error-note">{error}</p>}

      {result && (
        <div className={pending ? 'collation-out is-pending' : 'collation-out'}>
          <div className="resolve">
            <span className="resolve-label">resolves to</span>
            <span className="resolve-key">{result.canonicalKey}</span>
            <span className={curated ? 'origin-chip curated' : 'origin-chip phonetic'}>
              {curated ? 'curated family' : 'phonetic'}
            </span>
          </div>

          <p className="fan-label">
            {result.spellings.length > 1
              ? `${result.spellings.length} spellings collapse here`
              : 'a name of one spelling'}
          </p>

          <ul className="fan">
            {result.spellings.map((s, i) => (
              <li
                key={s.name}
                className={s.primary ? 'plate primary' : 'plate'}
                style={{ animationDelay: `${i * 55}ms` }}
              >
                <IlluminatedName name={s.name} className="plate-name" />
                {s.primary && <span className="plate-badge">set</span>}
                {s.popularity > 0 && <span className="plate-pop">{s.popularity.toLocaleString()}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
