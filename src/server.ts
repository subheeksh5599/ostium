import express from "express";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AgentSDK } from "./agent.js";
import { type SignedMandate, type MandateTokenLimit } from "./mandate.js";
import { checkWalletCli, demoSigningFlow, runCliCommand } from "./wallet-cli.js";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const WEB_DIST = join(__dirname, "..", "web", "dist");
const WEB_INDEX = join(WEB_DIST, "index.html");

if (existsSync(WEB_INDEX)) {
  app.use(express.static(WEB_DIST));
}

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

app.get("/api/mandates", (_req, res) => {
  res.json(mandates);
});

app.post("/api/mandates/create", (req, res) => {
  const { agentId, tokens, protocols, perTxLimit, dailyLimit, durationHours } = req.body;

  const a = initAgent(agentId);

  const tokenArr: MandateTokenLimit[] = tokens.split(",").map((t: string) => {
    const [ticker, perTx, daily] = t.split(":");
    return { ticker: ticker.trim(), perTxLimit: parseFloat(perTx), dailyLimit: parseFloat(daily) };
  });

  const protoArr = protocols.split(",").map((p: string) => ({ name: p.trim() }));

  const { mandate } = a.createCredential({
    tokens: tokenArr,
    protocols: protoArr,
    perTxLimit: parseFloat(perTxLimit),
    dailyLimit: parseFloat(dailyLimit),
    durationHours: parseInt(durationHours),
  });

  const signed = a.signMandate(mandate.id);
  mandates.push(signed);

  res.json(signed);
});

app.post("/api/propose", (req, res) => {
  const { mandateId, ticker, amount, protocol } = req.body;
  if (!agent) initAgent("YieldScout");

  const signed = mandates.find((m) => m.mandate.id === mandateId);
  if (!signed) return res.status(404).json({ error: "Mandate not found" });

  if (!agent) initAgent(signed.mandate.agentId);
  agent!.middleware.registerMandate(signed);

  agent!.proposeAction(mandateId, {
    ticker,
    amount: parseFloat(amount),
    protocol: protocol || undefined,
  }).then((log) => res.json(log));
});

app.post("/api/demo", async (_req, res) => {
  if (!agent) initAgent("YieldScout");

  const { mandate } = agent!.createCredential({
    tokens: [
      { ticker: "devUSDC", perTxLimit: 0.5, dailyLimit: 5 },
      { ticker: "devSOL", perTxLimit: 0.1, dailyLimit: 1 },
    ],
    protocols: [{ name: "jupiter" }, { name: "orca" }],
    perTxLimit: 1,
    dailyLimit: 5,
    durationHours: 24,
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

  res.json({ mandateId: mandate.id, results });
});

app.get("/api/audit", (_req, res) => {
  if (!agent) return res.json([]);
  res.json(agent.getExecutionLog());
});

app.get("/api/connect", async (_req, res) => {
  try {
    const { execSync } = await import("node:child_process");
    const result = execSync(
      "/home/arch/.npm-global/bin/wallet-cli session view --output json 2>&1",
      { encoding: "utf-8", timeout: 8000 }
    );
    const parsed = JSON.parse(result.trim());
    if (parsed?.ok) {
      res.json({ connected: true, port: 40000, message: "Speculos emulator connected" });
    } else {
      res.json({ connected: false, message: "No device or emulator detected. Try: pip install speculos && speculos --model nanosp --api-port 5000 apps/solana.elf" });
    }
  } catch {
    res.json({ connected: false, message: "No device found. Run Speculos emulator to demo hardware signing." });
  }
});

app.get("/api/cli-proof", async (_req, res) => {
  const results: string[] = [];
  
  const help = await runCliCommand("--help");
  results.push("$ wallet-cli --help");
  results.push(help.output.slice(0, 400));
  
  const dryRun = await runCliCommand("send --dry-run --to 11111111111111111111111111111111 --amount '0.001 SOL' --output json");
  results.push("\n$ wallet-cli send --dry-run --to 1111... --amount '0.001 SOL'");
  if (dryRun.ok) {
    results.push(dryRun.output.slice(0, 300));
  } else {
    results.push("[requires device/emulator] " + dryRun.output.slice(0, 200));
  }
  
  res.json({ proof: results.join("\n") });
});

app.get("/api/status", async (_req, res) => {
  const status = await checkWalletCli();
  res.json(status);
});

app.get("/api/cli-demo", async (_req, res) => {
  const output = await demoSigningFlow();
  res.json({ output });
});

app.get("/api/cli", async (req, res) => {
  const args = (req.query.args as string) || "--help";
  const result = await runCliCommand(args);
  res.json(result);
});

if (existsSync(WEB_INDEX)) {
  app.get("*", (_req, res) => {
    res.sendFile(WEB_INDEX);
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`\n  ostium — http://localhost:${PORT}\n`);
  const s = await checkWalletCli();
  console.log(`  Wallet CLI: ${s.installed ? `v${s.version} (${s.commands.length} commands)` : 'not found'}\n`);
});
