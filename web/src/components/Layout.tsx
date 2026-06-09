import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    fontFamily: 'var(--display)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: isActive ? 'var(--fg)' : 'var(--fg-dim)',
    textDecoration: 'none',
    padding: '8px 0',
    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
    transition: 'all 0.2s',
  });

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(8,8,7,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          padding: '0 8vw',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 52,
          }}
        >
          <NavLink
            to="/"
            style={{
              fontFamily: 'var(--display)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--fg)',
              textDecoration: 'none',
              letterSpacing: 1,
            }}
          >
            ostium
          </NavLink>

          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <NavLink
              to="/"
              end
              style={({ isActive }) => linkStyle(isActive)}
            >
              Home
            </NavLink>
            <NavLink
              to="/dashboard"
              style={({ isActive }) => linkStyle(isActive)}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/test"
              style={({ isActive }) => linkStyle(isActive)}
            >
              Test
            </NavLink>
            <NavLink
              to="/audit"
              style={({ isActive }) => linkStyle(isActive)}
            >
              Audit
            </NavLink>
          </div>
        </div>
      </nav>

      <main style={{ minHeight: '100vh', paddingTop: 52 }}>
        <Outlet />
      </main>

      <footer
        style={{
          padding: '40px 8vw',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: 'var(--fg-dim)',
          fontFamily: 'var(--display)',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        <span>ostium — built with Ledger Agent Stack</span>
        <span>
          <a
            href="https://github.com/LedgerHQ/agent-skills"
            target="_blank"
            rel="noopener"
            style={{ color: 'var(--fg-dim)' }}
          >
            DMK
          </a>
          {' + '}
          <a
            href="https://github.com/LedgerHQ/speculos"
            target="_blank"
            rel="noopener"
            style={{ color: 'var(--fg-dim)' }}
          >
            Speculos
          </a>
        </span>
      </footer>
    </>
  );
}
