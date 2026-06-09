import { useState, useEffect } from 'react';

interface TokenLimit {
  ticker: string;
  perTxLimit: number;
  dailyLimit: number;
}

interface Protocol {
  name: string;
}

interface MandateData {
  id: string;
  agentId: string;
  network: string;
  tokens: TokenLimit[];
  protocols: Protocol[];
  perTxLimit: number;
  dailyLimit: number;
  durationHours: number;
  createdAt: string;
  expiresAt: string;
  derivationPath: string;
}

interface SignedMandate {
  mandate: MandateData;
  mandateHash: string;
  signature: string | null;
  signedBy: string;
  signedAt: string | null;
}

export default function MandateDashboard() {
  const [mandates, setMandates] = useState<SignedMandate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMandates = async () => {
    try {
      const res = await fetch('/api/mandates');
      const data = await res.json();
      setMandates(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchMandates();
    const interval = setInterval(fetchMandates, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      style={{
        padding: '80px 8vw 60px',
        borderTop: '1px solid var(--border)',
      }}
      id="mandates"
    >
      <SectionHeader
        title="Active Mandates"
        subtitle="Hardware-signed. Time-bound. Limit-enforced."
      />

      {loading && (
        <div style={{ color: 'var(--fg-dim)', fontStyle: 'italic' }}>
          Loading mandates...
        </div>
      )}

      {!loading && mandates.length === 0 && (
        <EmptyState message="No mandates yet. Create one below." />
      )}

      <div style={{ display: 'grid', gap: 1 }}>
        {mandates.map((signed, i) => (
          <MandateCard key={signed.mandate.id} signed={signed} index={i} />
        ))}
      </div>
    </section>
  );
}

function MandateCard({ signed, index }: { signed: SignedMandate; index: number }) {
  const m = signed.mandate;
  const now = new Date();
  const exp = new Date(m.expiresAt);
  const isExpired = exp < now;
  const remMs = Math.max(0, exp.getTime() - now.getTime());
  const remH = Math.ceil(remMs / 3600000);
  const totalH = m.durationHours;
  const pctElapsed = totalH > 0 ? Math.min(100, ((totalH - remH) / totalH) * 100) : 0;

  const statusColor = isExpired
    ? 'var(--red)'
    : signed.signedBy === 'unsigned'
      ? 'var(--yellow)'
      : 'var(--green)';
  const statusText = isExpired
    ? 'EXPIRED'
    : signed.signedBy === 'unsigned'
      ? 'UNSIGNED'
      : 'ACTIVE';

  return (
    <div
      className="fade-in"
      style={{
        animationDelay: `${0.1 + index * 0.05}s`,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '12px 24px',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-active)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span
            style={{
              fontFamily: 'var(--display)',
              color: 'var(--accent)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
            onClick={() => navigator.clipboard.writeText(m.id)}
            title="Copy mandate ID"
          >
            {m.id.slice(0, 8)}
          </span>
          <span style={{ color: 'var(--fg-mid)', fontSize: 12 }}>{m.agentId}</span>
          <span style={{ color: 'var(--fg-dim)', fontSize: 10 }}>{m.network}</span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {m.tokens.map((t) => (
            <Tag key={t.ticker} label={`${t.ticker} ${t.perTxLimit}/tx ${t.dailyLimit}/day`} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {m.protocols.map((p) => (
            <span
              key={p.name}
              style={{
                padding: '2px 8px',
                fontSize: 10,
                border: '1px solid var(--border)',
                color: 'var(--fg-dim)',
                fontFamily: 'var(--display)',
                letterSpacing: 0.5,
              }}
            >
              {p.name}
            </span>
          ))}
        </div>

        <div
          style={{
            marginTop: 12,
            height: 4,
            background: 'var(--border)',
            width: '100%',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pctElapsed}%`,
              background:
                remH <= 2 ? 'var(--red)' : remH <= 6 ? 'var(--yellow)' : 'var(--green)',
              transition: 'width 1s ease',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 4,
            fontSize: 10,
            color: 'var(--fg-dim)',
          }}
        >
          <span>{remH}h remaining</span>
          <span>
            signed by{' '}
            <span style={{ color: signed.signedBy === 'speculos' ? 'var(--accent)' : 'var(--yellow)' }}>
              {signed.signedBy}
            </span>
          </span>
          <span>path {m.derivationPath}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 10px',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 2,
            color: statusColor,
            border: `1px solid ${statusColor}`,
            fontFamily: 'var(--display)',
          }}
        >
          {statusText}
        </span>
        <span style={{ fontSize: 9, color: 'var(--fg-dim)' }}>{exp.toISOString().replace('T', ' ').slice(0, 16)}</span>
      </div>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span
      style={{
        padding: '2px 8px',
        fontSize: 10,
        background: 'rgba(255,255,255,0.04)',
        color: 'var(--fg-mid)',
        fontFamily: 'var(--mono)',
      }}
    >
      {label}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '40px',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        textAlign: 'center',
        color: 'var(--fg-dim)',
        fontFamily: 'var(--display)',
        fontSize: 12,
        letterSpacing: 1,
      }}
    >
      {message}
    </div>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontFamily: 'var(--display)',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--fg)',
          textTransform: 'uppercase',
          letterSpacing: 2,
        }}
      >
        &rsaquo; {title}
      </h2>
      <p style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 4 }}>{subtitle}</p>
    </div>
  );
}
