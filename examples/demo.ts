import { AgentSDK } from "../src/agent.js";

async function main(): Promise<void> {
  const agent = new AgentSDK({
    agentId: "YieldScout",
    agentPubkey: "demo:key:yieldscout:v1",
    network: "solana:devnet",
    derivationPath: "44'/501'/0'/0'",
  });

  const { mandate, credential } = agent.createCredential({
    tokens: [
      { ticker: "devUSDC", perTxLimit: 0.5, dailyLimit: 5 },
      { ticker: "devSOL", perTxLimit: 0.1, dailyLimit: 1 },
    ],
    protocols: [{ name: "jupiter" }, { name: "orca" }],
    perTxLimit: 1,
    dailyLimit: 5,
    durationHours: 24,
  });

  agent.signMandate(mandate.id);

  const scenarios = [
    {
      label: "Allowed swap: 0.3 devUSDC via Jupiter",
      action: { ticker: "devUSDC", amount: 0.3, protocol: "jupiter" },
      expected: "approved",
    },
    {
      label: "Blocked: 2 devUSDC exceeds per-tx limit (0.5)",
      action: { ticker: "devUSDC", amount: 2, protocol: "jupiter" },
      expected: "rejected",
    },
    {
      label: "Blocked: Protocol 'raydium' not in mandate",
      action: { ticker: "devSOL", amount: 0.02, protocol: "raydium" },
      expected: "rejected",
    },
    {
      label: "Blocked: Token 'bonk' not in mandate",
      action: { ticker: "bonk", amount: 0.001, protocol: "orca" },
      expected: "rejected",
    },
    {
      label: "Allowed: 0.05 devSOL via Orca",
      action: { ticker: "devSOL", amount: 0.05, protocol: "orca" },
      expected: "approved",
    },
    {
      label: "Allowed: simple transfer, no protocol check",
      action: { ticker: "devSOL", amount: 0.01, targetAddress: "wallet123" },
      expected: "approved",
    },
  ];

  let pass = 0;
  let fail = 0;

  console.log("\n  ostium — Mandate Enforcement Tests\n");
  console.log(`  Mandate: ${mandate.id}\n`);

  for (const scenario of scenarios) {
    const result = await agent.proposeAction(mandate.id, scenario.action);
    const icon = result.status === scenario.expected ? "  PASS" : "  FAIL";

    if (result.status === scenario.expected) {
      pass++;
      console.log(`${icon}  ${scenario.label}`);
    } else {
      fail++;
      console.log(`${icon}  ${scenario.label}`);
      console.log(`        Expected ${scenario.expected}, got ${result.status}: ${result.reason}`);
    }
  }

  console.log(`\n  ${pass} passed, ${fail} failed\n`);

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(console.error);
