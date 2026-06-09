import { useState, useEffect } from 'react';
import { SectionHeader, EmptyState } from './MandateDashboard';
import { api } from '../api';

interface LogEntry {
  timestamp: string;
  mandateId: string;
  ticker: string;
  amount: number;
  protocol?: string;
  status: string;
  reason?: string;
}

export default function ExecutionLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const data = await api('/api/audit');
      setLogs(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      style={{
        padding: '60px 8vw 100px',
        borderTop: '1px solid var(--border)',
      }}
      id="audit"
    >
      <SectionHeader
        title="Execution Log"
        subtitle="Every proposed action — approved or blocked — audited here."
      />

      {loading && (
        <div style={{ color: 'var(--fg-dim)', fontStyle: 'italic' }}>
          Loading logs...
        </div>
      )}

      {!loading && logs.length === 0 && (
        <EmptyState message="No execution logs yet. Propose an action to see results." />
      )}

      {!loading && logs.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Mandate</th>
                <th>Ticker</th>
                <th>Amount</th>
                <th>Protocol</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {[...logs].reverse().slice(0, 50).map((l, i) => (
                <tr
                  key={i}
                  style={{
                    borderLeft: `3px solid ${l.status === 'approved' ? 'var(--green)' : 'var(--red)'}`,
                  }}
                >
                  <td style={{ color: 'var(--fg-dim)', fontSize: 10 }}>
                    {new Date(l.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                  </td>
                  <td>
                    <span
                      style={{
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        fontSize: 10,
                      }}
                      onClick={() => navigator.clipboard.writeText(l.mandateId)}
                    >
                      {l.mandateId.slice(0, 8)}
                    </span>
                  </td>
                  <td>{l.ticker}</td>
                  <td>{l.amount}</td>
                  <td>{l.protocol || '—'}</td>
                  <td>
                    <span
                      style={{
                        color: l.status === 'approved' ? 'var(--green)' : 'var(--red)',
                        fontWeight: 500,
                      }}
                    >
                      {l.status === 'approved' ? '+' : 'x'} {l.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--fg-dim)', fontSize: 10 }}>
                    {l.reason || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
