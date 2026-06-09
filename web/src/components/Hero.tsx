import { useState, useEffect } from 'react';

const LINES = [
  'Give your AI agent permission,',
  'not your keys.',
];

export default function Hero() {
  const [line, setLine] = useState(0);
  const [char, setChar] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (line >= LINES.length) {
      setDone(true);
      return;
    }
    const currentLine = LINES[line];
    if (char < currentLine.length) {
      const t = setTimeout(() => setChar(char + 1), 40 + Math.random() * 30);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setLine(line + 1);
        setChar(0);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [line, char, done]);

  return (
    <section
      style={{
        minHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '0 8vw',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ height: 8 }} />

        <h1
          style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(2rem, 5.5vw, 4rem)',
            fontWeight: 700,
            color: 'var(--fg)',
            lineHeight: 1.15,
            marginBottom: 4,
            maxWidth: 720,
          }}
        >
          {LINES[0].slice(0, line === 0 ? char : LINES[0].length)}
          {!done && line === 0 && (
            <span style={{ animation: 'blink 1s infinite', color: 'var(--accent)' }}>_</span>
          )}
          <br />
          {line >= 1 && LINES[1].slice(0, line === 1 ? char : LINES[1].length)}
          {!done && line === 1 && (
            <span style={{ animation: 'blink 1s infinite', color: 'var(--accent)' }}>_</span>
          )}
        </h1>

        <p
          className="fade-in"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 14,
            color: 'var(--fg-dim)',
            maxWidth: 520,
            marginTop: 20,
            lineHeight: 1.7,
            animationDelay: '0.6s',
          }}
        >
          Create hardware-signed mandates that define exactly what your AI agent can do
          &mdash; tokens, limits, protocols, duration &mdash; enforced before any transaction reaches
          the Ledger device screen.
        </p>

        <div
          className="fade-in"
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 32,
            animationDelay: '0.8s',
          }}
        >
          <a
            href="#create"
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              background: 'var(--accent)',
              color: 'var(--bg)',
              fontFamily: 'var(--display)',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              textDecoration: 'none',
            }}
          >
            Create Mandate
          </a>
          <a
            href="#demo"
            onClick={(e) => {
              e.preventDefault();
              (window as any).runDemo?.();
            }}
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              border: '1px solid var(--border-active)',
              color: 'var(--fg-dim)',
              fontFamily: 'var(--display)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: 1,
              textDecoration: 'none',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-active)')}
          >
            Run Demo
          </a>
        </div>

        <div
          className="fade-in"
          style={{
            display: 'flex',
            gap: 32,
            marginTop: 80,
            animationDelay: '1s',
          }}
        >
          <Stat value="$50B" label="Agent-managed assets by 2027" />
          <Stat value="10+" label="Verification checks per tx" />
          <Stat value="0" label="Private keys exposed" />
          <Stat value="100%" label="Hardware-enforced" />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--display)',
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--fg)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--fg-dim)',
          marginTop: 4,
          maxWidth: 140,
          lineHeight: 1.4,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
    </div>
  );
}
