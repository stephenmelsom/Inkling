import { useRef, useState } from 'react';
import type { DeckCard } from '../types';
import { IlluminatedName } from './IlluminatedName';

const THRESHOLD = 110;

const GENDER_LABEL: Record<string, string> = {
  boy: 'For a boy',
  girl: 'For a girl',
  neutral: 'Either way',
};

interface Props {
  card: DeckCard;
  onSwipe: (direction: 'like' | 'dislike') => void;
}

/** A draggable nameplate. Drag past the threshold to keep or pass (or use the buttons). */
export function SwipeCard({ card, onSwipe }: Props) {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<null | 'like' | 'dislike'>(null);
  const startX = useRef(0);
  const dragging = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    if (leaving) return;
    dragging.current = true;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setDx(e.clientX - startX.current);
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (dx > THRESHOLD) fly('like');
    else if (dx < -THRESHOLD) fly('dislike');
    else setDx(0);
  }

  function fly(direction: 'like' | 'dislike') {
    setLeaving(direction);
    setDx(direction === 'like' ? window.innerWidth : -window.innerWidth);
  }

  function onTransitionEnd() {
    if (leaving) onSwipe(leaving);
  }

  const rotate = dx / 20;
  const keepOpacity = Math.max(0, Math.min(1, dx / THRESHOLD));
  const passOpacity = Math.max(0, Math.min(1, -dx / THRESHOLD));

  return (
    <div
      className={`card ${leaving ? 'leaving' : ''}`}
      style={{ transform: `translateX(${dx}px) rotate(${rotate}deg)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTransitionEnd={onTransitionEnd}
    >
      <div className="stamp keep" style={{ opacity: keepOpacity }}>
        Keep
      </div>
      <div className="stamp pass" style={{ opacity: passOpacity }}>
        Pass
      </div>

      {card.gender && (
        <span className={`tag tag-${card.gender}`}>
          <span className="tag-dot" aria-hidden="true" />
          {GENDER_LABEL[card.gender]}
        </span>
      )}

      <div className="card-body">
        <IlluminatedName name={card.name} className="card-name" />
        {card.meaning && <p className="card-meaning">“{card.meaning}”</p>}
      </div>

      <div className="card-foot">
        {card.origin && <span className="origin">{card.origin}</span>}
        {card.origin && <span className="dot-sep" aria-hidden="true" />}
        <span className="source">{card.source}</span>
      </div>

      <div className="card-actions">
        <button className="action pass-btn" onClick={() => fly('dislike')} aria-label="Pass on this name">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        <button className="action keep-btn" onClick={() => fly('like')} aria-label="Keep this name">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
