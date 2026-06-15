import { useState } from 'react';
import { deleteFamily, getFamilies, saveFamily, type VariantFamily } from '../adminApi';
import { useLoader } from '../useLoader';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);

export function FamiliesEditor({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { data, error, loading, reload } = useLoader(getFamilies, onUnauthorized);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function guard(fn: () => Promise<unknown>) {
    setActionError(null);
    setBusy(true);
    try {
      await fn();
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="families">
      <div className="toolbar">
        {data && (
          <span className="muted">
            <span className="mono">{data.families.length}</span> families
          </span>
        )}
        <button className="btn-primary" onClick={() => setCreating(true)} disabled={creating}>
          New family
        </button>
      </div>

      {actionError && <p className="error-note">{actionError}</p>}
      {error && <p className="error-note">{error}</p>}

      {creating && (
        <FamilyCard
          family={{ id: '', members: [] }}
          isNew
          busy={busy}
          onSave={async (fam) => {
            await guard(() => saveFamily(fam));
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {loading && !data ? (
        <p className="muted">Opening the family book…</p>
      ) : (
        <div className="family-grid">
          {data?.families.map((fam) => (
            <FamilyCard
              key={fam.id}
              family={fam}
              busy={busy}
              onSave={(f) => guard(() => saveFamily(f))}
              onDelete={() => guard(() => deleteFamily(fam.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FamilyCard({
  family,
  isNew = false,
  busy,
  onSave,
  onDelete,
  onCancel,
}: {
  family: VariantFamily;
  isNew?: boolean;
  busy: boolean;
  onSave: (family: VariantFamily) => void;
  onDelete?: () => void;
  onCancel?: () => void;
}) {
  const [id, setId] = useState(family.id);
  const [members, setMembers] = useState<string[]>(family.members);
  const [entry, setEntry] = useState('');
  const [idTouched, setIdTouched] = useState(!isNew);

  function addMember() {
    const m = entry.trim();
    if (!m) return;
    if (!members.some((x) => x.toLowerCase() === m.toLowerCase())) {
      const next = [...members, m];
      setMembers(next);
      // For a new family, derive the id from the first spelling until edited.
      if (isNew && !idTouched && next.length === 1) setId(`fam:${slugify(m)}`);
    }
    setEntry('');
  }

  const dirty =
    isNew ||
    id !== family.id ||
    members.length !== family.members.length ||
    members.some((m, i) => m !== family.members[i]);

  return (
    <div className={isNew ? 'family-card is-new' : 'family-card'}>
      <div className="family-head">
        {isNew ? (
          <input
            className="family-id-input"
            placeholder="fam:identifier"
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setIdTouched(true);
            }}
          />
        ) : (
          <span className="key family-id">{id}</span>
        )}
      </div>

      <ul className="chips">
        {members.map((m, i) => (
          <li key={`${m}-${i}`} className={i === 0 ? 'chip base' : 'chip'}>
            <span>{m}</span>
            <button
              aria-label={`Remove ${m}`}
              className="chip-x"
              onClick={() => setMembers(members.filter((_, idx) => idx !== i))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className="member-add">
        <input
          placeholder="Add a spelling…"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addMember();
            }
          }}
        />
        <button className="btn-text" onClick={addMember}>
          Add
        </button>
      </div>

      <p className="family-hint">
        First spelling is the base form. A family needs at least two spellings.
      </p>

      <div className="family-actions">
        <button
          className="btn-primary"
          disabled={busy || !dirty || members.length < 2 || !id.trim()}
          onClick={() => onSave({ id: id.trim(), members })}
        >
          Save
        </button>
        {onCancel && (
          <button className="btn-text" onClick={onCancel}>
            Cancel
          </button>
        )}
        {onDelete && (
          <button className="btn-text danger" onClick={onDelete} disabled={busy}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
