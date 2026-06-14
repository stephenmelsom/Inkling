import { useRef, useState } from 'react';
import type { DeckCard } from '../types';

const THRESHOLD = 110;

const GENDER_LABEL: Record<string, string> = {
  boy: 'Boy',
  girl: 'Girl',
  neutral: 'Neutral',
};

interface Props {
  card: DeckCard;
  onSwipe: (direction: 'like' | 'dislike') => void;
}

/** A draggable Tinder-style card. Drag past the threshold (or use the buttons). */
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

  const rotate = dx / 18;
  const likeOpacity = Math.max(0, Math.min(1, dx / THRESHOLD));
  const nopeOpacity = Math.max(0, Math.min(1, -dx / THRESHOLD));

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
      <div className="stamp like" style={{ opacity: likeOpacity }}>
        LIKE
      </div>
      <div className="stamp nope" style={{ opacity: nopeOpacity }}>
        NOPE
      </div>

      {card.gender && <span className={`tag tag-${card.gender}`}>{GENDER_LABEL[card.gender]}</span>}
      <h2 className="card-name">{card.name}</h2>
      {card.meaning && <p className="card-meaning">“{card.meaning}”</p>}
      <div className="card-foot">
        {card.origin && <span className="origin">{card.origin}</span>}
        <span className="source">via {card.source}</span>
      </div>

      <div className="card-actions">
        <button className="action nope-btn" onClick={() => fly('dislike')} aria-label="Pass">
          ✕
        </button>
        <button className="action like-btn" onClick={() => fly('like')} aria-label="Like">
          ♥
        </button>
      </div>
    </div>
  );
}
