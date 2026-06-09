# delegate

**Hardware-signed mandates for AI agents — permission without keys.**

AI agents should not hold private keys. They should hold hardware-signed, time-bound, limit-enforced mandates that define exactly what they're allowed to do — and nothing more.

Built with the [Ledger Agent Stack](https://github.com/LedgerHQ/agent-skills): DMK + Wallet CLI + Speculos.

![Ledger Device Screen](LEDGER.png)

## How It Works

```
YOUR LEDGER WALLET (holds keys)
  |
  |  Create mandate: define tokens, limits, protocols, duration
  |  Mandate appears on Ledger screen → you press APPROVE
  |  Device cryptographically signs the mandate
  |
  v
delegate MIDDLEWARE (enforces limits)
  |
  |  Agent receives credential (mandate hash + ID — no key)
  |  Agent proposes actions autonomously
  |  Every tx checked against mandate:
  |    token allowed? amount within limit? protocol allowed? daily cap OK?
  |
  |  APPROVED → forwarded to Ledger for device signing
  |  BLOCKED  → logged to audit trail with reason
  |
  v
LEDGER DEVICE (signs approved txs)
  |
  |  Human reviews tx on hardware screen
  |  Confirms with physical buttons
  |  Device signs → broadcast
```

## Architecture

```
src/
├── mandate.ts     — Mandate schema, SHA-256 hashing, creation, validation
├── middleware.ts   — Enforcement engine, spend tracking, audit log
├── agent.ts        — Agent SDK, credential creation, action proposal
├── wallet-cli.ts   — Wallet CLI integration, device connection, signing flow
├── server.ts       — Express API server
└── cli.ts          — CLI commands

web/src/
├── pages/
│   ├── Home.tsx         — Hero, How It Works, Connect Ledger, Live Demo
│   ├── Dashboard.tsx    — Active mandates + create form
│   ├── Test.tsx         — Proposal tester with mandate selector
│   └── Audit.tsx        — Full execution log table
└── components/
    ├── Layout.tsx       — Nav bar + footer
    ├── Hero.tsx         — Typewriter hero
    ├── MandateDashboard.tsx
    ├── CreateMandate.tsx
    ├── ProposalTester.tsx
    └── ExecutionLog.tsx
```

## Quickstart

```bash
# Install
cd ledger-mandate && npm install && cd web && npm install && cd ..

# Start backend API
npm run server

# Start React frontend (separate terminal)
cd web && npm run dev
```

Open **http://localhost:3000** (production) or **http://localhost:5173** (dev with hot reload).

## Commands

```bash
npm run demo              # CLI test harness — 6 enforcement scenarios
npm run server            # Start API server
cd web && npm run build   # Build React for production
```

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/status` | Wallet CLI version + commands |
| `GET` | `/api/connect` | Scan for Ledger device / Speculos |
| `POST` | `/api/demo` | Run 6-scenario mandate enforcement demo |
| `GET` | `/api/mandates` | List all mandates |
| `POST` | `/api/mandates/create` | Create & sign a mandate |
| `POST` | `/api/propose` | Test a tx against a mandate |
| `GET` | `/api/audit` | Get execution audit log |

## Demo

```
$ npm run demo

  delegate — Mandate Enforcement Tests

  Mandate: 75da6b2154a55847

  PASS  Allowed: 0.3 devUSDC via Jupiter
  PASS  Blocked: 2 devUSDC exceeds per-tx limit (0.5)
  PASS  Blocked: Protocol 'raydium' not in mandate
  PASS  Blocked: Token 'bonk' not in mandate
  PASS  Allowed: 0.05 devSOL via Orca
  PASS  Allowed: simple transfer, no protocol check

  6 passed, 0 failed
```

## Why This Matters

| Current State | With delegate |
|---|---|
| Agent holds private key in memory | Agent holds mandate credential (key-less) |
| No spending limits at protocol level | Per-tx, per-token, daily limits in hardware |
| Any protocol, any token | Mandate allowlist enforced before signing |
| Permanent access | Time-bound, human-revokable |
| Compromise = everything lost | Compromise = blocked at mandate level |

## Built with the Ledger Agent Stack

- **DMK Skills** — SDK for agent-device communication
- **Wallet CLI** — Transaction assembly and signing
- **Speculos** — Open-source Ledger device emulator

No physical Ledger required — Speculos emulator is fully supported.

## License

MIT
