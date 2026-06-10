import { execSync, exec } from "node:child_process";
import { promisify } from "node:util";
const execAsync = promisify(exec);
function findCli() {
    try {
        return execSync("which wallet-cli 2>/dev/null", { encoding: "utf-8", timeout: 5000 }).trim() || null;
    }
    catch {
        return null;
    }
}
const CLI = findCli() || "wallet-cli";
let cachedStatus = null;
export async function checkWalletCli() {
    if (cachedStatus)
        return cachedStatus;
    try {
        const help = execSync(`${CLI} --help 2>/dev/null`, {
            encoding: "utf-8",
            timeout: 15000,
        });
        const parsed = JSON.parse(help.trim());
        const version = parsed?.data?.version || "unknown";
        const text = parsed?.data?.text || "";
        const cmdMatch = text.match(/^\s{2}(\w[\w-]*)/gm);
        const commands = cmdMatch ? cmdMatch.map((c) => c.trim()) : [];
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
    }
    catch (err) {
        const fallback = {
            installed: false,
            version: "",
            commands: [],
            sessionActive: false,
            speculosAvailable: false,
            deviceConnected: false,
            output: err.message?.slice(0, 200) || "Wallet CLI not found",
        };
        cachedStatus = fallback;
        return fallback;
    }
}
export async function runCliCommand(args) {
    try {
        const fullArgs = (args.includes("--help") || args.includes("--output"))
            ? args
            : `${args} --output json`;
        const result = await execAsync(`${CLI} ${fullArgs} 2>&1`, {
            timeout: 10000,
            maxBuffer: 1024 * 1024,
        });
        return { ok: true, output: result.stdout };
    }
    catch (err) {
        return { ok: false, output: err.stderr || err.stdout || err.message };
    }
}
export async function demoSigningFlow() {
    const steps = [];
    const check = await checkWalletCli();
    if (!check.installed) {
        steps.push("Wallet CLI not found on this server.");
        steps.push("Device signing requires running locally with:");
        steps.push("  cd ostium && npm run server");
        steps.push("");
        steps.push("Then: pip install speculos && speculos --model nanosp --api-port 5000 apps/solana.elf");
        return steps.join("\n");
    }
    steps.push(`Wallet CLI v${check.version} installed`);
    steps.push(`Available commands: ${check.commands.slice(0, 6).join(", ")}...`);
    steps.push("");
    const dryRun = await runCliCommand("send --dry-run --to 11111111111111111111111111111111 --amount '0.001 SOL' --output json");
    if (dryRun.ok) {
        steps.push("[DRY-RUN] Transaction assembly OK:");
        steps.push(dryRun.output.slice(0, 300));
    }
    else {
        steps.push("[DRY-RUN] Requires device/emulator: " + dryRun.output.slice(0, 200));
    }
    steps.push("");
    steps.push("HARDWARE SIGNING FLOW:");
    steps.push("  1. Agent proposes tx -> mandate checks limits");
    steps.push("  2. Approved -> Wallet CLI assembles tx");
    steps.push("  3. Tx appears on Ledger device screen");
    steps.push("  4. Human reviews & confirms on device");
    steps.push("  5. Device signs -> CLI broadcasts");
    steps.push("");
    steps.push("Speculos emulator:");
    steps.push("  pip install speculos");
    steps.push("  speculos --model nanosp --display headless --api-port 5000 apps/solana.elf");
    steps.push("");
    steps.push("Then: wallet-cli account discover solana:devnet");
    return steps.join("\n");
}
//# sourceMappingURL=wallet-cli.js.map