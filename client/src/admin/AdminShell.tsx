import { useState } from 'react';
import { OverviewView } from './sections/OverviewView';
import { NamesTable } from './sections/NamesTable';
import { FamiliesEditor } from './sections/FamiliesEditor';
import { ProvidersBoard } from './sections/ProvidersBoard';
import { CollationTester } from './sections/CollationTester';

type SectionId = 'overview' | 'names' | 'families' | 'providers' | 'collation';

interface SectionDef {
  id: SectionId;
  label: string;
  /** One-line description of what this part of the bindery is for. */
  blurb: string;
}

const SECTIONS: SectionDef[] = [
  { id: 'overview', label: 'Overview', blurb: 'What the deck is keeping and passing' },
  { id: 'names', label: 'Names', blurb: 'The dataset behind real, ranked names' },
  { id: 'families', label: 'Families', blurb: 'Spellings that should collapse to one' },
  { id: 'providers', label: 'Providers', blurb: 'The systems the deck draws from' },
  { id: 'collation', label: 'Collation', blurb: 'See how any name resolves' },
];

interface Props {
  onSignOut: () => void;
  onUnauthorized: () => void;
}

export function AdminShell({ onSignOut, onUnauthorized }: Props) {
  const [active, setActive] = useState<SectionId>('overview');
  const section = SECTIONS.find((s) => s.id === active)!;

  return (
    <div className="shell">
      <nav className="rail" aria-label="Bindery sections">
        <div className="rail-head">
          <span className="rail-mark">Inkling</span>
          <span className="rail-eyebrow">Bindery</span>
        </div>

        <ul className="rail-nav">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                className={s.id === active ? 'rail-link active' : 'rail-link'}
                aria-current={s.id === active ? 'page' : undefined}
                onClick={() => setActive(s.id)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>

        <button className="rail-signout" onClick={onSignOut}>
          Sign out
        </button>
      </nav>

      <main className="worktable">
        <header className="worktable-head">
          <h1 className="worktable-title">{section.label}</h1>
          <p className="worktable-blurb">{section.blurb}</p>
        </header>

        <div className="worktable-body">
          {active === 'overview' && <OverviewView onUnauthorized={onUnauthorized} />}
          {active === 'names' && <NamesTable onUnauthorized={onUnauthorized} />}
          {active === 'families' && <FamiliesEditor onUnauthorized={onUnauthorized} />}
          {active === 'providers' && <ProvidersBoard onUnauthorized={onUnauthorized} />}
          {active === 'collation' && <CollationTester onUnauthorized={onUnauthorized} />}
        </div>
      </main>
    </div>
  );
}
