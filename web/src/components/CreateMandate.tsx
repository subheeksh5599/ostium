import { useState } from 'react';
import { SectionHeader } from './MandateDashboard';

export default function CreateMandate({ onCreated }: { onCreated: () => void }) {
  const [agentId, setAgentId] = useState('YieldScout');
  const [tokens, setTokens] = useState('devUSDC:0.5:5,devSOL:0.1:1');
  const [protocols, setProtocols] = useState('jupiter,orca');
  const [perTx, setPerTx] = useState('1');
  const [daily, setDaily] = useState('5');
  const [duration, setDuration] = useState('24');
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setResult(null);
    try {
      const res = await fetch('/api/mandates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          tokens,
          protocols,
          perTxLimit: perTx,
          dailyLimit: daily,
          durationHours: duration,
        }),
      });
      const data = await res.json();
      setResult({
        ok: true,
        msg: `Mandate ${data.mandate.id.slice(0, 8)} created & signed by ${data.signedBy}`,
      });
      onCreated();
    } catch (err: any) {
      setResult({ ok: false, msg: `Error: ${err.message}` });
    }
    setCreating(false);
  };

  return (
    <section
      style={{
        padding: '60px 8vw',
        borderTop: '1px solid var(--border)',
      }}
      id="create"
    >
      <SectionHeader
        title="Create Mandate"
        subtitle="Define hardware-enforced limits for your agent."
      />

      <div
        style={{
          maxWidth: 560,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: 24,
        }}
      >
        <Field label="AGENT ID">
          <input value={agentId} onChange={(e) => setAgentId(e.target.value)} />
        </Field>

        <Field label="TOKENS (ticker:per-tx-limit:daily-limit)">
          <input value={tokens} onChange={(e) => setTokens(e.target.value)} />
        </Field>

        <Field label="PROTOCOLS">
          <input value={protocols} onChange={(e) => setProtocols(e.target.value)} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="PER-TX LIMIT">
            <input
              value={perTx}
              onChange={(e) => setPerTx(e.target.value)}
              placeholder="1"
            />
          </Field>
          <Field label="DAILY LIMIT">
            <input
              value={daily}
              onChange={(e) => setDaily(e.target.value)}
              placeholder="5"
            />
          </Field>
          <Field label="DURATION (HRS)">
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="24"
            />
          </Field>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            marginTop: 20,
            width: '100%',
            opacity: creating ? 0.6 : 1,
          }}
        >
          {creating ? 'SIGNING ON DEVICE...' : 'CREATE & SIGN MANDATE'}
        </button>

        {result && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              border: `1px solid ${result.ok ? 'var(--green)' : 'var(--red)'}`,
              color: result.ok ? 'var(--green)' : 'var(--red)',
              fontSize: 11,
              fontFamily: 'var(--display)',
            }}
          >
            {result.ok ? '[OK] ' : '[ERR] '}
            {result.msg}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 9,
          color: 'var(--fg-dim)',
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          fontFamily: 'var(--display)',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
