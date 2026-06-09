import { useState, useEffect } from 'react';

interface CliStatus {
  installed: boolean;
  version: string;
  commands: string[];
  deviceConnected: boolean;
}

export default function Home() {
  const [status, setStatus] = useState<CliStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [deviceMsg, setDeviceMsg] = useState('');
  const [deviceFound, setDeviceFound] = useState<boolean | null>(null);
  const [demoStep, setDemoStep] = useState(0);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoLogs, setDemoLogs] = useState<Array<{ step: number; label: string; status: string; reason?: string }>>([]);
  const [mandateId, setMandateId] = useState('');

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then(s => { setStatus(s); setDeviceFound(s.installed); })
      .catch(() => {});
  }, []);

  const connectDevice = async () => {
    setConnecting(true);
    setDeviceMsg('Scanning for Ledger device...');
    try {
      const res = await fetch('/api/connect');
      const data = await res.json();
      setDeviceFound(data.connected);
      setDeviceMsg(data.connected
        ? 'Connected to Ledger device / Speculos emulator on port ' + (data.port || 40000)
        : data.message
      );
    } catch {
      setDeviceFound(false);
      setDeviceMsg('Could not reach backend. Start with: npm run server');
    }
    setConnecting(false);
  };

  const runDemo = async () => {
    setDemoRunning(true);
    setDemoStep(1);
    setDemoLogs([]);
    await delay(600);
    setDemoStep(2);
    await delay(500);
    try {
      const res = await fetch('/api/demo', { method: 'POST' });
      const data = await res.json();
      setMandateId(data.mandateId);
      for (let i = 0; i < data.results.length; i++) {
        const r = data.results[i];
        setDemoLogs(prev => [...prev, { step: i + 1, label: r.label, status: r.status, reason: r.reason }]);
        setDemoStep(3 + i);
        await delay(350);
      }
      setDemoStep(9);
    } catch {
      setDemoLogs(prev => [...prev, { step: 99, label: 'Backend not reachable', status: 'rejected' }]);
    }
    setDemoRunning(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <section style={{ position: 'relative', zIndex: 1, padding: '100px 8vw 80px', maxWidth: 760 }}>
        <h1 style={{
          fontFamily: 'var(--display)', fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 700, color: 'var(--fg)', lineHeight: 1.15, marginBottom: 16,
        }}>
          Give your AI agent permission,<br />not your keys.
        </h1>

        <p style={{ color: 'var(--fg-dim)', fontSize: 14, lineHeight: 1.7, maxWidth: 520, marginBottom: 32 }}>
          Create hardware-signed mandates that define exactly what your agent can do
          &mdash; tokens, limits, protocols, duration &mdash; enforced before any
          transaction reaches the Ledger device screen.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 64 }}>
          <a href="/dashboard" style={{
            display: 'inline-block', padding: '14px 32px', background: 'var(--accent)', color: 'var(--bg)',
            fontFamily: 'var(--display)', fontSize: 12, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: 1, textDecoration: 'none',
          }}>Create Mandate</a>
          <button onClick={runDemo} disabled={demoRunning} style={{
            padding: '14px 32px', background: 'transparent',
            border: '1px solid var(--border-active)', color: 'var(--fg-dim)',
            fontFamily: 'var(--display)', fontSize: 12, textTransform: 'uppercase',
            letterSpacing: 1, cursor: 'pointer', opacity: demoRunning ? 0.5 : 1,
          }}>{demoRunning ? 'RUNNING...' : 'Run Live Demo'}</button>
          {demoStep > 0 && (
            <button onClick={() => { setDemoStep(0); setDemoLogs([]); setMandateId(''); setDemoRunning(false); }} style={{
              padding: '14px 20px', background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--fg-dim)', fontFamily: 'var(--display)', fontSize: 10,
              textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer',
            }}>Reset</button>
          )}
        </div>

        <HowItWorks />

        <ConnectDeviceCard
          status={status}
          connecting={connecting}
          deviceMsg={deviceMsg}
          deviceFound={deviceFound}
          onConnect={connectDevice}
        />

        <div style={{ display: 'flex', gap: 40, marginTop: 48, flexWrap: 'wrap' }}>
          <Stat v="$50B" l="Agent-managed assets by 2027" />
          <Stat v="0" l="Private keys exposed" />
          <Stat v="100%" l="Hardware-enforced" />
        </div>
      </section>

      {demoStep > 0 && <DemoPanel demoStep={demoStep} demoLogs={demoLogs} mandateId={mandateId} />}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { num: '01', title: 'Connect your Ledger wallet', desc: 'Your Ledger device holds the private keys. It is the wallet. delegate adds a security layer on top — hardware-signed mandates that define what your AI agent is allowed to do.', icon: '\u270D' },
    { num: '02', title: 'Agent receives credential', desc: 'Your AI agent gets a mandate credential — a hash + ID. No private key. No seed phrase. The agent cannot sign anything on its own.', icon: '\u2192' },
    { num: '03', title: 'Agent proposes transactions', desc: 'The agent works autonomously — analyzing markets, finding yield, executing strategies. Every proposed tx hits the mandate middleware first.', icon: '\u2699' },
    { num: '04', title: 'Middleware enforces limits', desc: 'Token in mandate? Amount within per-tx limit? Protocol allowed? Daily cap not exceeded? If any check fails, the tx is blocked and logged.', icon: '\u2714' },
    { num: '05', title: 'Device signs approved txs', desc: 'Only transactions that pass mandate checks reach the Ledger device. Human reviews on hardware screen. Device signs. Agent never touches keys.', icon: '\u26BF' },
  ];

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontFamily: 'var(--display)', fontSize: 12, fontWeight: 700, color: 'var(--fg)',
        textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16,
      }}>
        &rsaquo; How AI + Ledger Work Together
      </div>

      <div style={{ display: 'grid', gap: 1 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start',
          }}>
            <span style={{
              fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--accent)',
              minWidth: 32, lineHeight: 1.2,
            }}>{s.num}</span>
            <div>
              <div style={{ color: 'var(--fg)', fontSize: 12, fontFamily: 'var(--display)', marginBottom: 4 }}>
                {s.title}
              </div>
              <div style={{ color: 'var(--fg-dim)', fontSize: 11, lineHeight: 1.5 }}>
                {s.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectDeviceCard({
  status, connecting, deviceMsg, deviceFound, onConnect,
}: {
  status: CliStatus | null;
  connecting: boolean;
  deviceMsg: string;
  deviceFound: boolean | null;
  onConnect: () => void;
}) {
  return (
    <div style={{
      border: '1px solid var(--border)', background: 'var(--surface)',
      marginBottom: 32, maxWidth: 560,
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        fontFamily: 'var(--display)', fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: 2, color: 'var(--fg)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>&rsaquo; Connect Ledger Device</span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 9,
          color: deviceFound ? 'var(--green)' : deviceFound === false ? 'var(--yellow)' : 'var(--fg-dim)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: deviceFound ? 'var(--green)' : deviceFound === false ? 'var(--yellow)' : 'var(--fg-dim)',
            display: 'inline-block',
          }} />
          {deviceFound ? 'CONNECTED' : deviceFound === false ? 'NO DEVICE' : 'UNCHECKED'}
        </span>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, border: '2px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--display)', fontSize: 22, color: 'var(--fg-dim)',
            background: 'var(--bg)',
          }}>
            L
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              {status ? `Wallet CLI v${status.version}` : 'Checking...'}
            </div>
            <div style={{ color: 'var(--fg)', fontSize: 13, fontFamily: 'var(--display)', marginBottom: 4 }}>
              {deviceFound === true ? 'Ledger Nano S+ (Speculos)' : 'Ledger Device'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--fg-dim)', lineHeight: 1.4 }}>
              {deviceFound === true
                ? 'Signing via hardware. Keys never leave the device.'
                : deviceFound === false
                  ? 'Connect your Ledger device or start the Speculos emulator.'
                  : 'Your Ledger device stores keys. We enforce limits.'}
            </div>
          </div>
        </div>

        <button
          onClick={onConnect}
          disabled={connecting}
          style={{ width: '100%', padding: '12px 24px', opacity: connecting ? 0.5 : 1 }}
        >
          {connecting ? 'SCANNING...' : deviceFound ? 'RECONNECT' : 'SCAN FOR DEVICE'}
        </button>

        {deviceMsg && (
          <div style={{
            marginTop: 10, padding: '10px 14px', fontSize: 10, lineHeight: 1.5,
            color: deviceFound ? 'var(--green)' : 'var(--yellow)',
            fontFamily: 'var(--mono)',
            border: `1px solid ${deviceFound ? 'var(--green-dim)' : 'var(--yellow-dim)'}`,
            background: deviceFound ? 'var(--green-dim)' : 'var(--yellow-dim)',
          }}>
            {deviceMsg}
          </div>
        )}

        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ fontSize: 9, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            No physical device? Use the emulator:
          </div>
          <code style={{
            display: 'block', padding: '10px 14px', background: 'var(--bg)',
            border: '1px solid var(--border)', fontSize: 10, color: 'var(--fg-mid)',
            fontFamily: 'var(--mono)', lineHeight: 1.6, wordBreak: 'break-all',
          }}>
            pip install speculos{'\n'}
            speculos --model nanosp --display headless --api-port 5000 apps/solana.elf{'\n'}
            {'\n'}
            export SPECULOS_API=http://localhost:5000{'\n'}
            wallet-cli session view
          </code>
        </div>
      </div>
    </div>
  );
}

function DemoPanel({
  demoStep, demoLogs, mandateId,
}: {
  demoStep: number; demoLogs: Array<{ step: number; label: string; status: string; reason?: string }>; mandateId: string;
}) {
  return (
    <section style={{
      position: 'relative', zIndex: 1, padding: '0 8vw 60px', maxWidth: 760,
    }}>
      <div style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          fontFamily: 'var(--display)', fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: 2, color: 'var(--fg)',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>&rsaquo; Live Demo</span>
          {mandateId && <span style={{ color: 'var(--accent)', fontSize: 10 }}>MANDATE {mandateId.slice(0, 8)}</span>}
        </div>
        <div style={{ padding: 20 }}>
          <Step n={1} label="Create mandate with hardware-signed limits" done={demoStep >= 2} active={demoStep === 1} />
          <Step n={2} label="Mandate displayed on Ledger device screen" done={demoStep >= 3} active={demoStep === 2} />
          <Step n={3} label="Device cryptographically signs the mandate" done={demoStep >= 3} active={demoStep === 2} />
          {demoLogs.map((l, i) => (
            <Step key={i} n={3 + l.step} label={l.label} done={true} active={false} status={l.status} reason={l.reason} />
          ))}
          <Step n={9} label="0 keys exposed. 100% hardware-enforced from mandate to signature." done={demoStep >= 9} active={demoStep === 9} />
        </div>
        {demoStep >= 9 && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border)',
            background: 'var(--green-dim)', fontFamily: 'var(--display)',
            fontSize: 11, color: 'var(--green)',
          }}>
            &#10003; Demo complete. Hardware-enforced guardrails proven.
          </div>
        )}
      </div>
    </section>
  );
}

function Step({ n, label, done, active, status, reason }: {
  n: number; label: string; done: boolean; active: boolean; status?: string; reason?: string;
}) {
  const isRejected = status === 'rejected';
  const color = done ? (isRejected ? 'var(--red)' : 'var(--green)') : 'var(--fg-dim)';
  const bg = done ? (isRejected ? 'var(--red-dim)' : 'var(--green-dim)') : 'transparent';
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start', padding: '5px 0',
      opacity: done || active ? 1 : 0.25, transition: 'opacity 0.3s',
      borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
      paddingLeft: active ? 10 : 12,
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, fontSize: 9, fontWeight: 700, fontFamily: 'var(--display)',
        background: bg, border: `1px solid ${color}`, color,
      }}>
        {done ? (isRejected ? 'x' : '+') : n}
      </span>
      <div>
        <div style={{ fontSize: 11, color: done ? 'var(--fg-mid)' : 'var(--fg-dim)', fontFamily: 'var(--mono)' }}>
          {label}
        </div>
        {reason && <div style={{ fontSize: 9, color: 'var(--red)', marginTop: 2 }}>&rarr; {reason}</div>}
      </div>
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700, color: 'var(--fg)', lineHeight: 1.1 }}>{v}</div>
      <div style={{ fontSize: 9, color: 'var(--fg-dim)', marginTop: 4, maxWidth: 140, lineHeight: 1.3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{l}</div>
    </div>
  );
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
