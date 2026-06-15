import { useState } from 'react';
import type { LikedName } from '../types';
import { IlluminatedName } from './IlluminatedName';

interface Props {
  liked: LikedName[];
}

/** The register: kept names, each expandable to show how else the name is written. */
export function LikedPanel({ liked }: Props) {
  return (
    <aside className="register">
      <header className="register-head">
        <h2>The register</h2>
        <span className="register-count">
          {liked.length} {liked.length === 1 ? 'name' : 'names'} kept
        </span>
      </header>

      {liked.length === 0 ? (
        <p className="register-empty">
          Nothing kept yet. The names you keep are written down here — with every way they're spelled.
        </p>
      ) : (
        <ul className="register-list">
          {liked
            .slice()
            .reverse()
            .map((item) => (
              <LikedRow key={item.cardId} item={item} />
            ))}
        </ul>
      )}
    </aside>
  );
}

function LikedRow({ item }: { item: LikedName }) {
  const [open, setOpen] = useState(false);
  const hasVariants = item.spellings.length > 1;

  return (
    <li className="register-row">
      <button
        className="register-entry"
        onClick={() => hasVariants && setOpen((o) => !o)}
        aria-expanded={hasVariants ? open : undefined}
      >
        <IlluminatedName name={item.name} className="register-name" />
        {hasVariants && (
          <span className="register-also">
            also written {open ? '−' : '+'}
          </span>
        )}
      </button>
      {open && hasVariants && (
        <ul className="spellings">
          {item.spellings.map((s) => (
            <li key={s.name} className={s.primary ? 'spelling primary' : 'spelling'}>
              <span>{s.name}</span>
              {s.primary && <span className="badge">most chosen</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
