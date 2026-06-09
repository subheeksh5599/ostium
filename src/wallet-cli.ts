import { execSync, exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const CLI = "/home/arch/.npm-global/bin/wallet-cli";

export interface CliStatus {
  installed: boolean;
  version: string;
  commands: string[];
  sessionActive: boolean;
  speculosAvailable: boolean;
  deviceConnected: boolean;
  output: string;
}

let cachedStatus: CliStatus | null = null;

export async function checkWalletCli(): Promise<CliStatus> {
  if (cachedStatus) return cachedStatus;
  try {
    const help = execSync(`${CLI} --help 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 15000,
    });

    const parsed = JSON.parse(help.trim());
    const version = parsed?.data?.version || "unknown";

    const text = parsed?.data?.text || "";
    const cmdMatch = text.match(/^\s{2}(\w[\w-]*)/gm);
    const commands = cmdMatch ? cmdMatch.map((c: string) => c.trim()) : [];

    const result = {
      installed: true,
      version,
      commands,
      sessionActive: false,
      speculosAvailable: false,
      deviceConnected: false,
      output: JSON.stringify(parsed, null, 2).slice(0, 500),
    };
    cachedStatus = result;
    return result;
  } catch (err: any) {
    return {
      installed: false,
      version: "",
      commands: [],
      sessionActive: false,
      speculosAvailable: false,
      deviceConnected: false,
      output: err.message || "Wallet CLI not found",
    };
  }
}

export async function runCliCommand(
  args: string
): Promise<{ ok: boolean; output: string }> {
  try {
    const fullArgs = args.includes("--output") ? args : `${args} --output json`;
    const result = await execAsync(`${CLI} ${fullArgs} 2>&1`, {
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, output: result.stdout };
  } catch (err: any) {
    return { ok: false, output: err.stderr || err.stdout || err.message };
  }
}

export async function demoSigningFlow(): Promise<string> {
  const steps: string[] = [];

  const check = await checkWalletCli();
  if (!check.installed) {
    steps.push("ERROR: Ledger Wallet CLI not installed. Run: npm i -g @ledgerhq/wallet-cli");
    return steps.join("\n");
  }

  steps.push(`Wallet CLI v${check.version} installed`);
  steps.push(`Available commands: ${check.commands.slice(0, 6).join(", ")}...`);

  steps.push("");

  const dryRun = await runCliCommand("send --dry-run --to 11111111111111111111111111111111 --amount '0.001 SOL' --output json");
  if (dryRun.ok) {
    steps.push("[DRY-RUN] Transaction assembly succeeded (no device needed):");
    steps.push(dryRun.output.slice(0, 300));
  } else {
    steps.push("[DRY-RUN] Status: " + dryRun.output.slice(0, 200));
  }

  steps.push("");
  steps.push("DHARDWARE SIGNING FLOW (with Speculos or Ledger device):");
  steps.push("  1. Agent proposes tx → mandate middleware checks limits");
  steps.push("  2. If approved → Wallet CLI assembles transaction");
  steps.push("  3. Transaction displayed on device screen");
  steps.push("  4. Human reviews & confirms on device");
  steps.push("  5. Device signs → CLI broadcasts");
  steps.push("");
  steps.push("To demo with Speculos emulator:");
  steps.push("  pip install speculos");
  steps.push("  speculos --model nanosp --display headless --api-port 5000 apps/solana.elf");
  steps.push("");
  steps.push("Then connect: wallet-cli session view");

  return steps.join("\n");
}
