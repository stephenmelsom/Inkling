import { useState } from 'react';
import type { LikedName } from '../types';

interface Props {
  liked: LikedName[];
}

/** Sidebar of liked names; each expands to show the common spellings of that name. */
export function LikedPanel({ liked }: Props) {
  return (
    <aside className="liked-panel">
      <h3>Liked names ({liked.length})</h3>
      {liked.length === 0 && <p className="muted">Swipe right on names you love. They'll collect here.</p>}
      <ul className="liked-list">
        {liked
          .slice()
          .reverse()
          .map((item) => (
            <LikedRow key={item.cardId} item={item} />
          ))}
      </ul>
    </aside>
  );
}

function LikedRow({ item }: { item: LikedName }) {
  const [open, setOpen] = useState(false);
  const hasVariants = item.spellings.length > 1;

  return (
    <li className="liked-row">
      <button className="liked-head" onClick={() => hasVariants && setOpen((o) => !o)}>
        <span className="liked-name">{item.name}</span>
        {hasVariants && (
          <span className="variant-count">
            {item.spellings.length} spellings {open ? '▾' : '▸'}
          </span>
        )}
      </button>
      {open && hasVariants && (
        <ul className="spellings">
          {item.spellings.map((s) => (
            <li key={s.name} className={s.primary ? 'spelling primary' : 'spelling'}>
              <span>{s.name}</span>
              {s.primary && <span className="badge">most common</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
