import { getAnalytics, type Analytics, type NameTally } from '../adminApi';
import { useLoader } from '../useLoader';

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function OverviewView({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { data, error, loading } = useLoader<Analytics>(getAnalytics, onUnauthorized);

  if (loading) return <p className="muted">Reading the ledger…</p>;
  if (error) return <p className="error-note">{error}</p>;
  if (!data) return null;

  if (data.totalSwipes === 0) {
    return (
      <p className="empty-note">
        No swipes recorded yet. The ledger fills as people use the deck.
      </p>
    );
  }

  return (
    <div className="overview">
      <div className="stat-row">
        <Stat label="Sessions" value={data.sessions} />
        <Stat label="Swipes" value={data.totalSwipes} />
        <Stat label="Kept" value={data.totalKeeps} />
        <Stat label="Keep rate" value={pct(data.keepRate)} />
      </div>

      <div className="ledger-pair">
        <TallyTable title="Most kept" rows={data.topKept} metric="keeps" />
        <TallyTable title="Most passed" rows={data.topPassed} metric="passes" />
      </div>

      {data.byProvider.length > 0 && (
        <section className="panel">
          <h2 className="panel-title">By provider</h2>
          <table className="ledger">
            <thead>
              <tr>
                <th>Source</th>
                <th className="num">Kept</th>
                <th className="num">Passed</th>
              </tr>
            </thead>
            <tbody>
              {data.byProvider.map((p) => (
                <tr key={p.source}>
                  <td className="mono">{p.source}</td>
                  <td className="num">{p.keeps}</td>
                  <td className="num">{p.passes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function TallyTable({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: NameTally[];
  metric: 'keeps' | 'passes';
}) {
  return (
    <section className="panel">
      <h2 className="panel-title">{title}</h2>
      {rows.length === 0 ? (
        <p className="muted">Nothing yet.</p>
      ) : (
        <table className="ledger">
          <thead>
            <tr>
              <th>Name</th>
              <th>Canonical key</th>
              <th className="num">{metric === 'keeps' ? 'Kept' : 'Passed'}</th>
              <th className="num">Keep rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.canonicalKey}>
                <td className="name-cell">{r.name}</td>
                <td>
                  <span className="key">{r.canonicalKey}</span>
                </td>
                <td className="num">{metric === 'keeps' ? r.keeps : r.passes}</td>
                <td className="num">{pct(r.keepRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
