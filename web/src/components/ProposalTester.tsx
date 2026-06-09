import { useState, useEffect } from 'react';
import { SectionHeader } from './MandateDashboard';

interface Mandate {
  mandate: {
    id: string;
    agentId: string;
    tokens: Array<{ ticker: string; perTxLimit: number; dailyLimit: number }>;
    protocols: Array<{ name: string }>;
    perTxLimit: number;
    dailyLimit: number;
    durationHours: number;
  };
  signedBy: string;
}

export default function ProposalTester({ onProposed }: { onProposed: () => void }) {
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [mandateId, setMandateId] = useState('');
  const [ticker, setTicker] = useState('devUSDC');
  const [amount, setAmount] = useState('2');
  const [protocol, setProtocol] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    reason?: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/mandates')
      .then((r) => r.json())
      .then((data) => {
        setMandates(data);
        if (data.length > 0 && !mandateId) {
          setMandateId(data[data.length - 1].mandate.id);
        }
      })
      .catch(() => {});
  }, []);

  const selected = mandates.find((m) => m.mandate.id === mandateId);

  const handlePropose = async () => {
    if (!mandateId) return;
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch('/api/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mandateId,
          ticker,
          amount,
          protocol: protocol || undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
      onProposed();
    } catch (err: any) {
      setResult({ status: 'error', reason: err.message });
    }
    setTesting(false);
  };

  return (
    <section
      style={{ padding: '60px 8vw', borderTop: '1px solid var(--border)' }}
      id="test"
    >
      <SectionHeader
        title="Test Proposal"
        subtitle="Simulate agent actions against active mandates."
      />

      <div style={{ maxWidth: 560, background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <Label>MANDATE</Label>
          {mandates.length === 0 ? (
            <div style={{
              padding: '14px', border: '1px solid var(--yellow)',
              background: 'var(--yellow-dim)', color: 'var(--yellow)',
              fontSize: 11, fontFamily: 'var(--display)',
            }}>
              No mandates exist yet.{' '}
              <a href="/dashboard" style={{ color: 'var(--accent)' }}>Create one first</a>
            </div>
          ) : (
            <select
              value={mandateId}
              onChange={(e) => setMandateId(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px',
                background: 'var(--bg)', color: 'var(--fg)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--mono)', fontSize: 11,
                outline: 'none', cursor: 'pointer',
              }}
            >
              {mandates.map((m) => (
                <option key={m.mandate.id} value={m.mandate.id}>
                  {m.mandate.id.slice(0, 8)} — {m.mandate.agentId} ({m.signedBy})
                </option>
              ))}
            </select>
          )}
        </div>

        {selected && (
          <div style={{
            marginBottom: 16, padding: '10px 12px',
            background: 'var(--bg)', border: '1px solid var(--border)',
            fontSize: 10, color: 'var(--fg-dim)',
          }}>
            <div style={{ marginBottom: 4, color: 'var(--fg-mid)' }}>
              Tokens: {selected.mandate.tokens.map((t) => `${t.ticker} ${t.perTxLimit}/tx ${t.dailyLimit}/day`).join(', ')}
            </div>
            <div>
              Protocols: {selected.mandate.protocols.map((p) => p.name).join(', ') || 'any'}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <Label>TICKER</Label>
            <input value={ticker} onChange={(e) => setTicker(e.target.value)} />
          </div>
          <div>
            <Label>AMOUNT</Label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>PROTOCOL</Label>
            <input value={protocol} onChange={(e) => setProtocol(e.target.value)} placeholder="optional" />
          </div>
        </div>

        <button
          onClick={handlePropose}
          disabled={testing || !mandateId}
          style={{ marginTop: 20, width: '100%' }}
        >
          {testing ? 'CHECKING...' : 'PROPOSE ACTION'}
        </button>

        {result && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              padding: '14px 18px',
              border: `1px solid ${result.status === 'approved' ? 'var(--green)' : 'var(--red)'}`,
              background: result.status === 'approved' ? 'var(--green-dim)' : 'var(--red-dim)',
              fontFamily: 'var(--display)', fontSize: 12,
            }}>
              <div style={{
                color: result.status === 'approved' ? 'var(--green)' : 'var(--red)',
                fontWeight: 700, marginBottom: 4,
              }}>
                {result.status === 'approved' ? '[APPROVED]' : '[BLOCKED]'}
              </div>
              <div style={{ color: 'var(--fg-mid)', fontSize: 11 }}>
                {result.status === 'approved'
                  ? 'Within mandate limits — ready for device signing'
                  : result.reason}
              </div>
            </div>

            <div style={{
              marginTop: 12, background: 'var(--bg)', border: '1px solid var(--border)',
              padding: 14, fontFamily: 'var(--mono)', fontSize: 10,
              lineHeight: 1.8, color: 'var(--fg-dim)',
            }}>
              <div style={{ color: 'var(--fg-mid)', marginBottom: 6 }}>LEDGER DEVICE DISPLAY</div>
              <div>{'\u2550'.repeat(36)}</div>
              <div>  REVIEW TRANSACTION</div>
              <div style={{ marginTop: 4 }}>
                <span style={{ color: 'var(--accent)' }}>{ticker}</span>&nbsp;{amount}
              </div>
              {protocol && <div>Protocol: {protocol}</div>}
              <div style={{ marginTop: 8 }}>
                <span style={{ color: 'var(--green)' }}>APPROVE</span>
                &nbsp;&nbsp;<span style={{ color: 'var(--fg-dim)' }}>REJECT</span>
              </div>
              <div>{'\u2550'.repeat(36)}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, color: 'var(--fg-dim)', marginBottom: 4,
      textTransform: 'uppercase', letterSpacing: 1.5,
      fontFamily: 'var(--display)',
    }}>
      {children}
    </div>
  );
}
