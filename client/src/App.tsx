import { useEffect, useState } from 'react';
import { SwipeCard } from './components/SwipeCard';
import { LikedPanel } from './components/LikedPanel';
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
        <h1>BabyNamer</h1>
        <p className="tagline">Swipe right on names you love.</p>
      </header>

      <main className="layout">
        <section className="deck-area">
          <div className="deck">
            {back && (
              <div className="card card-back">
                <h2 className="card-name">{back.name}</h2>
              </div>
            )}
            {front ? (
              <SwipeCard key={front.id} card={front} onSwipe={onSwipe} />
            ) : done ? (
              <div className="empty">
                <p>That's every distinct name we have for now.</p>
                <button className="restart" onClick={() => start()}>
                  Start over
                </button>
              </div>
            ) : (
              <div className="empty">
                <p>Finding names…</p>
              </div>
            )}
          </div>
          <p className="hint">Drag the card, or tap ✕ / ♥</p>
        </section>

        <LikedPanel liked={liked} />
      </main>
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
      <h1>BabyNamer</h1>
      <p className="tagline">A Tinder-style way to find a baby name.</p>
      <p className="blurb">
        Names come from multiple proposal systems. We collapse spelling variants and nicknames so you
        only ever swipe on genuinely different names — then show you the common spellings once you like one.
      </p>

      <div className="gender-choice">
        <button onClick={() => onStart('girl')}>Girl names</button>
        <button onClick={() => onStart('boy')}>Boy names</button>
        <button onClick={() => onStart('neutral')}>Neutral</button>
        <button className="secondary" onClick={() => onStart(undefined)}>
          Surprise me
        </button>
      </div>

      {providers && (
        <p className="providers">
          Sources:{' '}
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
