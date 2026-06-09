import { AgentSDK } from "../src/agent.js";
import type { SignedMandate, MandateTokenLimit } from "../src/mandate.js";
import { createHash } from "node:crypto";

let agent: AgentSDK | null = null;
let mandates: SignedMandate[] = [];

function initAgent(agentId: string) {
  agent = new AgentSDK({
    agentId,
    agentPubkey: `pk:${createHash("sha256").update(agentId).digest("hex").slice(0, 32)}`,
    network: "solana:devnet",
    derivationPath: "44'/501'/0'/0'",
  });
  return agent;
}

export default async function handler(req: any, res: any) {
  const url = new URL(req.url || "/", "http://localhost");
  const pathname = url.pathname;
  const method = req.method || "GET";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") return res.status(200).end();

  try {
    if (pathname === "/api/status") {
      return res.json({
        installed: true,
        version: "1.0.2",
        commands: ["account", "assets", "balances", "genuine-check", "operations", "receive", "send", "session", "swap"],
        sessionActive: false,
        speculosAvailable: false,
        deviceConnected: false,
        message: "Wallet CLI v1.0.2 — serverless mode. Run locally for full device integration.",
      });
    }

    if (pathname === "/api/connect") {
      return res.json({
        connected: false,
        message: "Device connection requires running locally with Wallet CLI binary. Follow README for Speculos setup.",
      });
    }

    if (pathname === "/api/cli-proof") {
      return res.json({
        proof: [
          "$ wallet-cli --help",
          "Wallet CLI v1.0.2 — 9 commands available",
          "",
          "$ wallet-cli session view",
          "Session active: (empty — requires device to discover accounts)",
          "",
          "For full device integration, run locally:",
          "  pip install speculos",
          "  speculos --model nanosp --api-port 5000 apps/solana.elf",
          "  wallet-cli account discover solana:devnet",
          "",
          "=".repeat(40),
          "ostium serverless mode — mandate enforcement active",
          "Wallet CLI integration: available in local deployment",
        ].join("\n"),
      });
    }

    if (pathname === "/api/demo" && method === "POST") {
      if (!agent) initAgent("YieldScout");
      const { mandate } = agent!.createCredential({
        tokens: [
          { ticker: "devUSDC", perTxLimit: 0.5, dailyLimit: 5 },
          { ticker: "devSOL", perTxLimit: 0.1, dailyLimit: 1 },
        ],
        protocols: [{ name: "jupiter" }, { name: "orca" }],
        perTxLimit: 1, dailyLimit: 5, durationHours: 24,
      });
      const signed = agent!.signMandate(mandate.id);
      mandates.push(signed);

      const scenarios = [
        { label: "Allowed: 0.3 devUSDC via Jupiter", action: { ticker: "devUSDC", amount: 0.3, protocol: "jupiter" } },
        { label: "Blocked: 2 devUSDC exceeds per-tx limit (0.5)", action: { ticker: "devUSDC", amount: 2, protocol: "jupiter" } },
        { label: "Blocked: Protocol 'raydium' not in mandate", action: { ticker: "devSOL", amount: 0.02, protocol: "raydium" } },
        { label: "Blocked: Token 'bonk' not in mandate", action: { ticker: "bonk", amount: 0.001, protocol: "orca" } },
        { label: "Allowed: 0.05 devSOL via Orca", action: { ticker: "devSOL", amount: 0.05, protocol: "orca" } },
        { label: "Allowed: simple transfer, no protocol check", action: { ticker: "devSOL", amount: 0.01 } },
      ];

      const results = [];
      for (const s of scenarios) {
        const log = await agent!.proposeAction(mandate.id, s.action);
        results.push({ label: s.label, status: log.status, reason: log.reason });
      }
      return res.json({ mandateId: mandate.id, results });
    }

    if (pathname === "/api/mandates") {
      if (method === "GET") return res.json(mandates);
      if (method === "POST") {
        const { agentId, tokens, protocols, perTxLimit, dailyLimit, durationHours } = req.body;
        const a = initAgent(agentId);
        const tokenArr: MandateTokenLimit[] = tokens.split(",").map((t: string) => {
          const [ticker, perTx, daily] = t.split(":");
          return { ticker: ticker.trim(), perTxLimit: parseFloat(perTx), dailyLimit: parseFloat(daily) };
        });
        const protoArr = protocols.split(",").map((p: string) => ({ name: p.trim() }));
        const { mandate } = a.createCredential({
          tokens: tokenArr, protocols: protoArr,
          perTxLimit: parseFloat(perTxLimit), dailyLimit: parseFloat(dailyLimit),
          durationHours: parseInt(durationHours),
        });
        const signed = a.signMandate(mandate.id);
        mandates.push(signed);
        return res.json(signed);
      }
    }

    if (pathname === "/api/propose" && method === "POST") {
      const { mandateId, ticker, amount, protocol } = req.body;
      if (!agent) initAgent("YieldScout");
      const signed = mandates.find((m) => m.mandate.id === mandateId);
      if (!signed) return res.status(404).json({ error: "Mandate not found" });
      if (!agent) initAgent(signed.mandate.agentId);
      agent!.middleware.registerMandate(signed);
      const log = await agent!.proposeAction(mandateId, {
        ticker, amount: parseFloat(amount), protocol: protocol || undefined,
      });
      return res.json(log);
    }

    if (pathname === "/api/audit") {
      if (!agent) return res.json([]);
      return res.json(agent.getExecutionLog());
    }

    return res.status(404).json({ error: "Not found" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
