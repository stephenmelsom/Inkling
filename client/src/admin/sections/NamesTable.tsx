import { useEffect, useState } from 'react';
import {
  createName,
  deleteName,
  getNames,
  updateName,
  type NameInput,
  type StoredName,
} from '../adminApi';
import type { Gender } from '../../types';
import { useLoader } from '../useLoader';

const GENDERS: Gender[] = ['girl', 'boy', 'neutral'];
const BLANK: NameInput = { name: '', gender: 'girl', count: 0, origin: '', meaning: '' };

export function NamesTable({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [draft, setDraft] = useState<NameInput>(BLANK);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 220);
    return () => clearTimeout(t);
  }, [query]);

  const { data, error, loading, reload } = useLoader(
    () => getNames(debounced),
    onUnauthorized,
    [debounced],
  );

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

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    await guard(async () => {
      await createName({ ...draft, name: draft.name.trim() });
      setDraft(BLANK);
    });
  }

  return (
    <div className="names">
      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Search names…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {data && (
          <span className="muted">
            {data.names.length} shown · <span className="mono">{data.total}</span> total
          </span>
        )}
      </div>

      <form className="add-row" onSubmit={add}>
        <input
          placeholder="New name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <select
          value={draft.gender}
          onChange={(e) => setDraft({ ...draft, gender: e.target.value as Gender })}
        >
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <input
          className="num-input"
          type="number"
          min={0}
          placeholder="count"
          value={draft.count || ''}
          onChange={(e) => setDraft({ ...draft, count: Number(e.target.value) })}
        />
        <input
          placeholder="origin"
          value={draft.origin ?? ''}
          onChange={(e) => setDraft({ ...draft, origin: e.target.value })}
        />
        <input
          placeholder="meaning"
          value={draft.meaning ?? ''}
          onChange={(e) => setDraft({ ...draft, meaning: e.target.value })}
        />
        <button className="btn-primary" type="submit" disabled={busy || !draft.name.trim()}>
          Add
        </button>
      </form>

      {actionError && <p className="error-note">{actionError}</p>}
      {error && <p className="error-note">{error}</p>}

      {loading && !data ? (
        <p className="muted">Pulling the dataset…</p>
      ) : (
        <table className="ledger">
          <thead>
            <tr>
              <th>Name</th>
              <th>Gender</th>
              <th className="num">Count</th>
              <th>Origin</th>
              <th>Meaning</th>
              <th aria-label="actions" />
            </tr>
          </thead>
          <tbody>
            {data?.names.map((row) => (
              <NameRow
                key={row.id}
                row={row}
                busy={busy}
                onSave={(input) => guard(() => updateName(row.id, input))}
                onDelete={() => guard(() => deleteName(row.id))}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function NameRow({
  row,
  busy,
  onSave,
  onDelete,
}: {
  row: StoredName;
  busy: boolean;
  onSave: (input: NameInput) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<NameInput>(row);

  if (!editing) {
    return (
      <tr>
        <td className="name-cell">{row.name}</td>
        <td>
          <span className={`g-tag g-${row.gender}`}>{row.gender}</span>
        </td>
        <td className="num">{row.count}</td>
        <td>{row.origin ?? '—'}</td>
        <td className="meaning">{row.meaning ?? '—'}</td>
        <td className="row-actions">
          <button
            className="btn-text"
            onClick={() => {
              setForm(row);
              setEditing(true);
            }}
          >
            Edit
          </button>
          <button className="btn-text danger" onClick={onDelete} disabled={busy}>
            Delete
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="editing">
      <td>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </td>
      <td>
        <select
          value={form.gender}
          onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
        >
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          className="num-input"
          type="number"
          min={0}
          value={form.count}
          onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
        />
      </td>
      <td>
        <input
          value={form.origin ?? ''}
          onChange={(e) => setForm({ ...form, origin: e.target.value })}
        />
      </td>
      <td>
        <input
          value={form.meaning ?? ''}
          onChange={(e) => setForm({ ...form, meaning: e.target.value })}
        />
      </td>
      <td className="row-actions">
        <button
          className="btn-text"
          disabled={busy || !form.name.trim()}
          onClick={() => {
            onSave({ ...form, name: form.name.trim() });
            setEditing(false);
          }}
        >
          Save
        </button>
        <button className="btn-text" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </td>
    </tr>
  );
}
