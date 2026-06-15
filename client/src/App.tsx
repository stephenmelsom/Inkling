import { useEffect, useRef, useState } from 'react';
import { SwipeCard } from './components/SwipeCard';
import { LikedPanel } from './components/LikedPanel';
import { IlluminatedName } from './components/IlluminatedName';
import * as api from './api';
import type { DeckCard, Gender, LikedName, ProviderInfo } from './types';

const BUFFER_SIZE = 3;

export function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [buffer, setBuffer] = useState<DeckCard[]>([]);
  const [liked, setLiked] = useState<LikedName[]>([]);
  const [done, setDone] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo | null>(null);

  useEffect(() => {
    api.getProviders().then(setProviders).catch(() => {});
  }, []);

  async function start(gender?: Gender) {
    const { sessionId: id } = await api.createSession(gender);
    setSessionId(id);
    setDone(false);
    setLiked([]);
    await fillBuffer(id, []);
  }

  /** Top the buffer up to BUFFER_SIZE, marking the deck done if it dries up. */
  async function fillBuffer(id: string, current: DeckCard[]) {
    let buf = current;
    while (buf.length < BUFFER_SIZE) {
      const { card } = await api.getNext(id);
      if (!card) {
        setDone(true);
        break;
      }
      buf = [...buf, card];
      setBuffer(buf);
    }
  }

  async function onSwipe(direction: 'like' | 'dislike') {
    if (!sessionId || buffer.length === 0) return;
    const card = buffer[0];
    const rest = buffer.slice(1);
    setBuffer(rest);

    try {
      await api.swipe(sessionId, card.id, direction);
      if (direction === 'like') {
        const { liked: updated } = await api.getLiked(sessionId);
        setLiked(updated);
      }
    } catch {
      /* ignore transient errors; deck keeps moving */
    }
    fillBuffer(sessionId, rest);
  }

  if (!sessionId) {
    return <StartScreen providers={providers} onStart={start} />;
  }

  const front = buffer[0];
  const back = buffer[1];

  return (
    <div className="app">
      <header className="app-header">
        <span className="wordmark">Inkling</span>
        <span className="app-tagline">Keep the ones worth keeping</span>
      </header>

      <main className="layout">
        <section className="deck-area">
          <div className="deck">
            {back && (
              <div className="card card-back" aria-hidden="true">
                <IlluminatedName name={back.name} className="card-name" />
              </div>
            )}
            {front ? (
              <SwipeCard key={front.id} card={front} onSwipe={onSwipe} />
            ) : done ? (
              <div className="empty">
                <p className="empty-line">That's every distinct name we have for you tonight.</p>
                <button className="restart" onClick={() => start()}>
                  Begin again
                </button>
              </div>
            ) : (
              <div className="empty">
                <p className="empty-line">Turning the page…</p>
              </div>
            )}
          </div>
          <p className="hint">Drag the card, or tap to pass and keep</p>
        </section>

        <LikedPanel liked={liked} />
      </main>
    </div>
  );
}

const DEMO_NAMES = ['Eleanor', 'Soren', 'Maeve', 'Aurelio', 'Wren', 'Theodore', 'Isolde', 'Caspian'];

/** Cycles names through the illuminated treatment — a live taste of the card. */
function RotatingName() {
  const [i, setI] = useState(0);
  const reduced = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (reduced.current) return;
    const t = setInterval(() => setI((n) => (n + 1) % DEMO_NAMES.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="hero-name" aria-hidden="true">
      <IlluminatedName key={DEMO_NAMES[i]} name={DEMO_NAMES[i]} className="hero-name-text" />
    </div>
  );
}

function StartScreen({
  providers,
  onStart,
}: {
  providers: ProviderInfo | null;
  onStart: (gender?: Gender) => void;
}) {
  return (
    <div className="start">
      <span className="wordmark start-wordmark">Inkling</span>

      <RotatingName />

      <p className="lede">
        The first thing you'll ever give them. Keep the names you love — we quietly fold
        away the spelling variants and nicknames, so you only ever weigh names that are
        truly different.
      </p>

      <div className="gender-choice">
        <button onClick={() => onStart('girl')}>Girl names</button>
        <button onClick={() => onStart('boy')}>Boy names</button>
        <button onClick={() => onStart('neutral')}>Either way</button>
        <button className="secondary" onClick={() => onStart(undefined)}>
          Surprise me
        </button>
      </div>

      {providers && (
        <p className="providers">
          <span className="providers-label">Drawn from</span>
          {providers.providers.map((p) => (
            <span
              key={p.id}
              className={providers.available.includes(p.id) ? 'src on' : 'src off'}
              title={providers.available.includes(p.id) ? 'available' : 'unavailable'}
            >
              {p.label}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
