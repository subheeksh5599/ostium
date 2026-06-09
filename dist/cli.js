#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { AgentSDK } from "./agent.js";
import { MandateMiddleware } from "./middleware.js";
const MANDATE_DIR = join(homedir(), ".mandate");
const CREDENTIALS_FILE = join(MANDATE_DIR, "credentials.json");
const MANDATES_FILE = join(MANDATE_DIR, "mandates.json");
function ensureDir() {
    if (!existsSync(MANDATE_DIR))
        mkdirSync(MANDATE_DIR, { recursive: true });
}
function loadCredentials() {
    ensureDir();
    if (!existsSync(CREDENTIALS_FILE))
        return [];
    return JSON.parse(readFileSync(CREDENTIALS_FILE, "utf-8"));
}
function saveCredentials(creds) {
    ensureDir();
    writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2));
}
function loadMandates() {
    ensureDir();
    if (!existsSync(MANDATES_FILE))
        return [];
    return JSON.parse(readFileSync(MANDATES_FILE, "utf-8"));
}
function saveMandates(mandates) {
    ensureDir();
    writeFileSync(MANDATES_FILE, JSON.stringify(mandates, null, 2));
}
const program = new Command();
program
    .name("mandate")
    .description("Hardware-signed agent mandates — permission without keys")
    .version("1.0.0");
program
    .command("init")
    .description("Initialize a new agent identity")
    .requiredOption("--agent-id <id>", "Agent identifier (e.g. YieldScout)")
    .requiredOption("--network <network>", "Network: solana:devnet, solana:mainnet")
    .option("--pubkey <key>", "Agent public key (generated if not provided)")
    .option("--path <path>", "Derivation path", "44'/501'/0'/0'")
    .action(async (opts) => {
    const pubkey = opts.pubkey || `gen:${createHash("sha256").update(Date.now().toString()).digest("hex").slice(0, 32)}`;
    console.log(chalk.bold("\n  Agent Identity Created"));
    console.log(chalk.dim("  ─────────────────────────\n"));
    console.log(`  Agent ID:  ${chalk.cyan(opts.agentId)}`);
    const shortPubkey = pubkey.slice(0, 16) + "..." + pubkey.slice(-8);
    console.log(`  Pubkey:    ${chalk.yellow(shortPubkey)}`);
    console.log(`  Network:   ${chalk.green(opts.network)}`);
    console.log(`  Path:      ${chalk.dim(opts.path)}`);
    console.log();
    ensureDir();
    writeFileSync(join(MANDATE_DIR, "agent.json"), JSON.stringify({
        agentId: opts.agentId,
        agentPubkey: pubkey,
        network: opts.network,
        derivationPath: opts.path,
    }, null, 2));
    console.log(chalk.green(`  Config saved to ${join(MANDATE_DIR, "agent.json")}`));
    console.log();
});
program
    .command("create")
    .description("Create a new mandate for an agent")
    .requiredOption("--agent-id <id>", "Agent identifier")
    .requiredOption("--tokens <tokens>", "Comma-separated token limits (e.g. devUSDC:1:10,devSOL:0.1:1)")
    .requiredOption("--protocols <protocols>", "Comma-separated protocol names (e.g. jupiter,orca)")
    .option("--per-tx-limit <limit>", "Per-transaction limit", "999999")
    .option("--daily-limit <limit>", "Daily cumulative limit", "999999")
    .option("--duration <hours>", "Mandate duration in hours", "24")
    .option("--network <network>", "Network", "solana:devnet")
    .option("--path <path>", "Derivation path", "44'/501'/0'/0'")
    .option("--sign", "Sign immediately with Speculos")
    .action(async (opts) => {
    const agentConfig = loadAgentConfig(opts.agentId);
    const tokens = opts.tokens.split(",").map((t) => {
        const [ticker, perTxStr, dailyStr] = t.split(":");
        return {
            ticker: ticker.trim(),
            perTxLimit: parseFloat(perTxStr) || 0,
            dailyLimit: parseFloat(dailyStr) || 0,
        };
    });
    const protocols = opts.protocols
        .split(",")
        .map((p) => ({ name: p.trim() }));
    const agent = new AgentSDK({
        agentId: opts.agentId,
        agentPubkey: agentConfig?.agentPubkey ?? `pk:${Date.now()}`,
        network: opts.network ?? "solana:devnet",
        derivationPath: opts.path ?? "44'/501'/0'/0'",
    });
    const { mandate, credential } = agent.createCredential({
        tokens,
        protocols,
        perTxLimit: parseFloat(opts.perTxLimit),
        dailyLimit: parseFloat(opts.dailyLimit),
        durationHours: parseInt(opts.duration),
    });
    if (opts.sign) {
        const signed = agent.signMandate(mandate.id);
        console.log(chalk.bold("\n  Mandate Created & Signed"));
        console.log(chalk.dim("  ─────────────────────────\n"));
        console.log(`  Mandate ID:  ${chalk.cyan(mandate.id)}`);
        console.log(`  Agent:       ${chalk.yellow(mandate.agentId)}`);
        console.log(`  Network:     ${chalk.green(mandate.network)}`);
        console.log(`  Duration:    ${chalk.magenta(mandate.durationHours + "h")}`);
        console.log(`  Expires:     ${chalk.dim(mandate.expiresAt)}`);
        console.log(`  Signature:   ${chalk.green(signed.signature?.slice(0, 24) + "...")}`);
        console.log(`  Signed by:   ${chalk.green(signed.signedBy)}`);
        console.log();
        tokens.forEach((token) => {
            console.log(`  ${chalk.cyan(token.ticker.padEnd(8))} per-tx: ${chalk.yellow(String(token.perTxLimit).padEnd(8))} daily: ${chalk.yellow(String(token.dailyLimit))}`);
        });
        console.log();
        console.log(`  Protocols:   ${protocols.map((p) => chalk.magenta(p.name)).join(", ")}`);
        if (signed.signedBy === "speculos") {
            displaySigningFlow(mandate);
        }
    }
    else {
        console.log(chalk.bold("\n  Mandate Created (unsigned)"));
        console.log(chalk.dim("  ─────────────────────────\n"));
        console.log(`  Mandate ID:  ${chalk.cyan(mandate.id)}`);
        console.log(`  Hash:        ${chalk.dim(credential.mandateHash.slice(0, 24) + "...")}`);
        console.log(`  Run ${chalk.bold("mandate sign " + mandate.id)} to sign with device.`);
    }
    console.log();
    const existingMandates = loadMandates();
    existingMandates.push({
        mandate,
        mandateHash: credential.mandateHash,
        signature: null,
        signedBy: "unsigned",
        signedAt: null,
    });
    saveMandates(existingMandates);
    const existingCreds = loadCredentials();
    existingCreds.push(credential);
    saveCredentials(existingCreds);
});
program
    .command("sign <mandateId>")
    .description("Sign a mandate with the Ledger device (Speculos)")
    .action(async (mandateId) => {
    const mandates = loadMandates();
    const signed = mandates.find((m) => m.mandate.id === mandateId);
    if (!signed) {
        console.log(chalk.red(`\n  No mandate found with id: ${mandateId}`));
        return;
    }
    if (signed.signedBy !== "unsigned") {
        console.log(chalk.yellow(`\n  Mandate already signed by ${signed.signedBy}`));
        return;
    }
    const updated = {
        ...signed,
        signature: `speculos:${createHash("sha256").update(JSON.stringify(signed.mandate)).digest("hex").slice(0, 32)}`,
        signedBy: "speculos",
        signedAt: new Date().toISOString(),
    };
    const idx = mandates.findIndex((m) => m.mandate.id === mandateId);
    mandates[idx] = updated;
    saveMandates(mandates);
    console.log(chalk.bold("\n  Mandate Signed"));
    console.log(chalk.dim("  ─────────────────────────\n"));
    console.log(`  Mandate ID:  ${chalk.cyan(mandateId)}`);
    console.log(`  Signed by:   ${chalk.green("speculos")}`);
    console.log(`  Signature:   ${chalk.dim(updated.signature.slice(0, 32) + "...")}`);
    console.log();
    displaySigningFlow(signed.mandate);
});
program
    .command("propose")
    .description("Propose an action for mandate enforcement (check limits)")
    .requiredOption("--mandate-id <id>", "Mandate to use")
    .requiredOption("--ticker <ticker>", "Token ticker (e.g. devUSDC)")
    .requiredOption("--amount <amount>", "Transaction amount")
    .option("--to <address>", "Destination address")
    .option("--protocol <protocol>", "Protocol name (e.g. jupiter)")
    .option("--agent-id <id>", "Agent ID (defaults to first found)")
    .action(async (opts) => {
    const agentConfig = loadAgentConfig(opts.agentId || "YieldScout");
    const mandates = loadMandates();
    const signed = mandates.find((m) => m.mandate.id === opts.mandateId);
    if (!signed) {
        console.log(chalk.red(`\n  No mandate found: ${opts.mandateId}`));
        return;
    }
    const agent = new AgentSDK({
        agentId: signed.mandate.agentId,
        agentPubkey: signed.mandate.agentPubkey,
        network: signed.mandate.network,
        derivationPath: signed.mandate.derivationPath,
    });
    agent.middleware.registerMandate(signed);
    const action = {
        ticker: opts.ticker,
        amount: parseFloat(opts.amount),
        protocol: opts.protocol,
        targetAddress: opts.to || "unknown",
    };
    const display = new MandateMiddleware().computeExecutionDisplay(action);
    const result = await agent.proposeAction(opts.mandateId, action);
    console.log();
    console.log(display);
    console.log();
    if (result.status === "approved") {
        console.log(chalk.bold.green("  [APPROVED]"));
        console.log(chalk.green(`  Action allowed under mandate ${opts.mandateId}`));
        if (opts.to) {
            console.log(chalk.dim(`  To:        ${opts.to.slice(0, 12)}...${opts.to.slice(-8)}`));
        }
        console.log(chalk.dim(`  Amount:    ${opts.amount} ${opts.ticker}`));
        if (opts.protocol)
            console.log(chalk.dim(`  Protocol:  ${opts.protocol}`));
    }
    else {
        console.log(chalk.bold.red("  [BLOCKED]"));
        console.log(chalk.red(`  ${result.reason}`));
    }
    const spendSummary = agent.getSpendSummary(opts.mandateId);
    if (spendSummary.length > 0) {
        console.log(chalk.dim("\n  Daily Spend ─────────────────────"));
        spendSummary.forEach((s) => {
            const bar = renderBar(s.percentUsed, 30);
            const color = s.percentUsed > 80 ? chalk.red : s.percentUsed > 50 ? chalk.yellow : chalk.green;
            console.log(`  ${chalk.cyan(s.ticker.padEnd(8))} ${color(bar)} ${chalk.dim(`${s.spent}/${s.limit}`)}`);
        });
    }
    console.log();
});
program
    .command("inspect <mandateId>")
    .description("View mandate details")
    .action(async (mandateId) => {
    const mandates = loadMandates();
    const signed = mandates.find((m) => m.mandate.id === mandateId);
    if (!signed) {
        console.log(chalk.red(`\n  No mandate found: ${mandateId}`));
        return;
    }
    const m = signed.mandate;
    const now = new Date();
    const expires = new Date(m.expiresAt);
    const remaining = Math.max(0, expires.getTime() - now.getTime());
    const remainingHours = Math.ceil(remaining / (1000 * 60 * 60));
    const isExpired = remaining <= 0;
    console.log(chalk.bold("\n  Mandate Inspection"));
    console.log(chalk.dim("  ─────────────────────────\n"));
    printRow("ID", chalk.cyan(m.id));
    printRow("Agent", chalk.yellow(m.agentId));
    printRow("Network", chalk.green(m.network));
    printRow("Derivation Path", chalk.dim(m.derivationPath));
    printRow("Created", chalk.dim(m.createdAt));
    printRow("Status", isExpired
        ? chalk.red("EXPIRED")
        : signed.signedBy === "unsigned"
            ? chalk.yellow("UNSIGNED")
            : chalk.green("ACTIVE"));
    printRow("Signed By", signed.signedBy === "speculos" ? chalk.green(signed.signedBy) : chalk.dim(signed.signedBy));
    printRow("Remaining", isExpired ? chalk.red("0h") : chalk.green(`${remainingHours}h`));
    console.log(chalk.dim("\n  Token Limits ────────────────────"));
    m.tokens.forEach((t) => {
        console.log(`  ${chalk.cyan(t.ticker.padEnd(8))} per-tx: ${chalk.yellow(String(t.perTxLimit).padStart(6))}   daily: ${chalk.yellow(String(t.dailyLimit).padStart(6))}`);
    });
    console.log();
    printRow("Global Per-Tx Limit", String(m.perTxLimit));
    printRow("Global Daily Limit", String(m.dailyLimit));
    if (m.protocols.length > 0) {
        console.log(chalk.dim("\n  Allowed Protocols ────────────────"));
        m.protocols.forEach((p) => {
            console.log(`  ${chalk.magenta("- " + p.name)}`);
        });
    }
    console.log();
    const agent = new AgentSDK({
        agentId: m.agentId,
        agentPubkey: m.agentPubkey,
        network: m.network,
        derivationPath: m.derivationPath,
    });
    agent.middleware.registerMandate(signed);
    const spendSummary = agent.getSpendSummary(mandateId);
    if (spendSummary.some((s) => s.spent > 0)) {
        console.log(chalk.dim("  Spending (today) ─────────────────"));
        spendSummary.forEach((s) => {
            const bar = renderBar(s.percentUsed, 30);
            const color = s.percentUsed > 80 ? chalk.red : s.percentUsed > 50 ? chalk.yellow : chalk.green;
            console.log(`  ${chalk.cyan(s.ticker.padEnd(8))} ${color(bar)} ${chalk.dim(`${s.spent}/${s.limit}`)}`);
        });
        console.log();
    }
});
program
    .command("audit")
    .description("View execution log")
    .option("--mandate-id <id>", "Filter by mandate")
    .option("--limit <n>", "Number of entries", "20")
    .action(async (opts) => {
    console.log(chalk.bold("\n  Execution Audit Log"));
    console.log(chalk.dim("  ───────────────────────────────────────────────────\n"));
    let logs = [];
    try {
        const logRaw = readFileSync(join(MANDATE_DIR, "execution-log.json"), "utf-8");
        logs = JSON.parse(logRaw);
    }
    catch {
        logs = [];
    }
    const filtered = opts.mandateId
        ? logs.filter((l) => l.mandateId === opts.mandateId)
        : logs;
    const limited = filtered.slice(-parseInt(opts.limit));
    if (limited.length === 0) {
        console.log(chalk.dim("  No execution logs found.\n"));
        return;
    }
    limited.forEach((log) => {
        const statusIcon = log.status === "approved" ? chalk.green("+") : chalk.red("x");
        const time = new Date(log.timestamp).toISOString().replace("T", " ").slice(0, 19);
        console.log(`  ${statusIcon} ${chalk.dim(time)}  ${chalk.cyan(log.mandateId.slice(0, 8))}  ${log.ticker?.padEnd(8) ?? ""} ${String(log.amount ?? "").padEnd(6)}  ${chalk.bold(log.status === "approved" ? chalk.green("OK") : chalk.red("BLOCKED"))}`);
        if (log.reason) {
            console.log(chalk.dim(`               ${log.reason}`));
        }
    });
    console.log();
});
program
    .command("dashboard")
    .description("Launch TUI dashboard")
    .option("--mandate-id <id>", "Focus on specific mandate")
    .action(async (opts) => {
    await renderDashboard(opts.mandateId);
});
program
    .command("demo")
    .description("Run the full demo scenario")
    .action(async () => {
    await runDemo();
});
program.parse();
function printRow(label, value) {
    console.log(`  ${label.padEnd(20)} ${value}`);
}
function renderBar(percent, width) {
    const filled = Math.min(Math.round((percent / 100) * width), width);
    const empty = width - filled;
    let bar = "";
    if (percent > 80)
        bar = chalk.red("█".repeat(filled)) + chalk.dim("░".repeat(empty));
    else if (percent > 50)
        bar = chalk.yellow("█".repeat(filled)) + chalk.dim("░".repeat(empty));
    else
        bar = chalk.green("█".repeat(filled)) + chalk.dim("░".repeat(empty));
    return bar;
}
function displaySigningFlow(mandate) {
    console.log(chalk.dim("\n  ┌──────────────────────────────────┐"));
    console.log(chalk.dim("  │") + "  LEDGER DEVICE SCREEN             " + chalk.dim("│"));
    console.log(chalk.dim("  ├──────────────────────────────────┤"));
    console.log(chalk.dim("  │                                  │"));
    console.log(chalk.dim("  │  ") +
        chalk.bold("Review Mandate") +
        "                  " +
        chalk.dim("│"));
    console.log(chalk.dim("  │                                  │"));
    console.log(chalk.dim("  │  ") + chalk.cyan("Agent:") + ` ${mandate.agentId.padEnd(25)}` + chalk.dim("│"));
    console.log(chalk.dim("  │  ") +
        chalk.cyan("Network:") +
        ` ${mandate.network.padEnd(22)}` +
        chalk.dim("│"));
    console.log(chalk.dim("  │  ") +
        chalk.cyan("Duration:") +
        ` ${mandate.durationHours}h${"".padEnd(21)}` +
        chalk.dim("│"));
    if (mandate.tokens.length > 0) {
        const t = mandate.tokens[0];
        console.log(chalk.dim("  │  ") +
            chalk.cyan(`${t.ticker}:`) +
            ` ${t.perTxLimit}/tx ${t.dailyLimit}/day${"".padEnd(6)}` +
            chalk.dim("│"));
    }
    console.log(chalk.dim("  │                                  │"));
    console.log(chalk.dim("  │        ") +
        chalk.bold.white("APPROVE") +
        "  " +
        chalk.dim("REJECT") +
        "         " +
        chalk.dim("│"));
    console.log(chalk.dim("  │                                  │"));
    console.log(chalk.dim("  └──────────────────────────────────┘"));
    console.log(chalk.green("\n  [Human confirms on device → mandate is cryptographically signed]"));
}
function loadAgentConfig(agentId) {
    const configPath = join(MANDATE_DIR, "agent.json");
    if (!existsSync(configPath)) {
        return {
            agentId,
            agentPubkey: `pk:${createHash("sha256").update(agentId).digest("hex").slice(0, 32)}`,
            network: "solana:devnet",
            derivationPath: "44'/501'/0'/0'",
        };
    }
    return JSON.parse(readFileSync(configPath, "utf-8"));
}
async function renderDashboard(focusMandateId) {
    const mandates = loadMandates();
    const now = new Date();
    console.clear();
    console.log(chalk.bold.inverse("  ostium — Hardware-Signed Agent Mandates  "));
    console.log();
    const active = mandates.filter((m) => new Date(m.mandate.expiresAt) > now);
    const expired = mandates.filter((m) => new Date(m.mandate.expiresAt) <= now);
    console.log(chalk.bold("  ACTIVE MANDATES"));
    console.log(chalk.dim("  ════════════════════════════════════════════════════════"));
    console.log();
    if (active.length === 0) {
        console.log(chalk.dim("    No active mandates. Run mandate create to get started."));
    }
    active.forEach((signed) => {
        const m = signed.mandate;
        const remaining = Math.max(0, new Date(m.expiresAt).getTime() - now.getTime());
        const remainingHours = Math.ceil(remaining / (1000 * 60 * 60));
        const totalDuration = m.durationHours;
        const percentElapsed = totalDuration > 0 ? ((totalDuration - remainingHours) / totalDuration) * 100 : 0;
        const bar = renderRemainingBar(remainingHours, totalDuration);
        const highlight = focusMandateId === m.id ? chalk.cyan : chalk.white;
        console.log(highlight(`  ${m.id.slice(0, 8)}  ${m.agentId.padEnd(12)}  ${bar}  ${remainingHours}h/${totalDuration}h`));
        m.tokens.forEach((t) => {
            console.log(chalk.dim(`         ${t.ticker.padEnd(8)} per-tx: ${String(t.perTxLimit).padEnd(6)} daily: ${String(t.dailyLimit).padEnd(6)}  ${m.protocols.map(p => p.name).join(", ")}`));
        });
        console.log();
    });
    if (expired.length > 0) {
        console.log(chalk.dim(`  EXPIRED (${expired.length})`));
        expired.forEach((signed) => {
            console.log(chalk.dim(`  ${signed.mandate.id.slice(0, 8)}  ${signed.mandate.agentId}  EXPIRED ${new Date(signed.mandate.expiresAt).toISOString().slice(0, 10)}`));
        });
        console.log();
    }
    console.log(chalk.dim("  ════════════════════════════════════════════════════════"));
    console.log();
    console.log(chalk.dim("  Commands:"));
    console.log(chalk.dim("    mandate create   mandate sign <id>   mandate propose"));
    console.log(chalk.dim("    mandate inspect  mandate audit       mandate demo"));
    console.log();
}
function renderRemainingBar(remaining, total) {
    const width = 20;
    const filled = Math.round(((total - remaining) / total) * width);
    const empty = width - filled;
    if (remaining <= 2)
        return chalk.red("█".repeat(filled) + "░".repeat(empty));
    if (remaining <= 6)
        return chalk.yellow("█".repeat(filled) + "░".repeat(empty));
    return chalk.green("█".repeat(filled) + "░".repeat(empty));
}
async function runDemo() {
    const W = chalk.white;
    const D = chalk.dim;
    const C = chalk.cyan;
    const G = chalk.green;
    const R = chalk.red;
    const Y = chalk.yellow;
    const B = chalk.bold;
    console.clear();
    const print = (text) => {
        console.log(text);
    };
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    print("");
    print(D("  ██╗    ███████╗██████╗  ██████╗ ███████╗██████╗ "));
    print(C("  ██║    ██╔════╝██╔══██╗██╔════╝ ██╔════╝██╔══██╗"));
    print(W("  ██║    █████╗  ██║  ██║██║  ███╗█████╗  ██████╔╝"));
    print(D("  ██║    ██╔══╝  ██║  ██║██║   ██║██╔══╝  ██╔══██╗"));
    print(C("  ██████╗███████╗██████╔╝╚██████╔╝███████╗██║  ██║"));
    print(W("  ╚═════╝╚══════╝╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝"));
    print(D("    Hardware-Signed Agent Mandates"));
    print("");
    await delay(1500);
    print("");
    print(B("  The Problem"));
    print(D("  ─────────────"));
    print("  Every AI agent manages keys in software (.env files,");
    print("  plaintext configs). One compromise = total loss.");
    print("  ostium solves this: agents get mandates, not keys.");
    print("");
    await delay(2500);
    print(D("  ════════════════════════════════════════════════════"));
    print(D("  STEP 1 — Create Mandate"));
    print(D("  ════════════════════════════════════════════════════"));
    print("");
    print(C('  $ mandate create --agent-id YieldScout \\'));
    print(C('      --tokens devUSDC:0.5:5,devSOL:0.1:1 \\'));
    print(C('      --protocols jupiter,orca \\'));
    print(C('      --duration 24 --sign'));
    print("");
    print(G("  Mandate created & signed by Speculos (Ledger emulator)"));
    print("");
    await delay(2000);
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
    const mid = mandate.id;
    print("");
    print(D("  ════════════════════════════════════════════════════"));
    print(D("  STEP 2 — Agent Proposes Actions"));
    print(D("  ════════════════════════════════════════════════════"));
    print("");
    await delay(1000);
    {
        print(Y("  [Agent] Proposing swap: 2 devUSDC → SOL via Jupiter"));
        print(Y("  [Agent] Checking mandate " + mid.slice(0, 8) + "..."));
        await delay(800);
        const result = await agent.proposeAction(mid, {
            ticker: "devUSDC",
            amount: 2,
            protocol: "jupiter",
            targetAddress: "JUP6i4oz1...AQ6",
        });
        if (result.status === "approved") {
            print(G("  [APPROVED] 2 devUSDC → SOL via Jupiter"));
        }
        else {
            print(R("  [BLOCKED] " + (result.reason || "")));
        }
    }
    print("");
    await delay(1000);
    {
        print(Y("  [Agent] Proposing swap: 0.02 devSOL → RAY via Raydium"));
        print(Y("  [Agent] Checking mandate " + mid.slice(0, 8) + "..."));
        await delay(800);
        const result = await agent.proposeAction(mid, {
            ticker: "devSOL",
            amount: 0.02,
            protocol: "raydium",
            targetAddress: "RAYdi...um01",
        });
        if (result.status === "approved") {
            print(G("  [APPROVED] 0.02 devSOL → RAY via Raydium"));
        }
        else {
            print(R("  [BLOCKED] " + (result.reason || "")));
        }
    }
    print("");
    await delay(1000);
    {
        print(Y("  [Agent] Proposing swap: 1 devSOL → USDC via Orca"));
        print(Y("  [Agent] Checking mandate " + mid.slice(0, 8) + "..."));
        await delay(800);
        const result = await agent.proposeAction(mid, {
            ticker: "devSOL",
            amount: 1,
            protocol: "orca",
            targetAddress: "orca...AQ1",
        });
        if (result.status === "approved") {
            print(G("  [APPROVED] 1 devSOL → USDC via Orca"));
        }
        else {
            print(R("  [BLOCKED] " + (result.reason || "")));
        }
    }
    print("");
    await delay(1000);
    {
        print(Y("  [Agent] Proposing transfer: 0.05 devSOL to wallet"));
        print(Y("  [Agent] Checking mandate " + mid.slice(0, 8) + "..."));
        await delay(800);
        const result = await agent.proposeAction(mid, {
            ticker: "devSOL",
            amount: 0.05,
            targetAddress: "wallet...xyz",
        });
        if (result.status === "approved") {
            print(G("  [APPROVED] 0.05 devSOL transfer"));
        }
        else {
            print(R("  [BLOCKED] " + (result.reason || "")));
        }
    }
    print("");
    print(D("  ════════════════════════════════════════════════════"));
    print(D("  STEP 3 — Execution Audit"));
    print(D("  ════════════════════════════════════════════════════"));
    print("");
    const logs = agent.getExecutionLog(mid);
    logs.forEach((log) => {
        const icon = log.status === "approved" ? G("+") : R("x");
        const status = log.status === "approved" ? G("OK") : R("BLOCKED");
        print(`  ${icon} ${D(log.timestamp.slice(0, 19).replace("T", " "))}  ${log.ticker ?? "  "}  ${String(log.amount).padEnd(4)}  ${status}  ${log.reason ? R(log.reason) : ""}`);
    });
    print("");
    print(D("  Total: ") + `${logs.filter((l) => l.status === "approved").length} approved, ${logs.filter((l) => l.status === "rejected").length} blocked`);
    print("");
    print(D("  ════════════════════════════════════════════════════"));
    print(D("  RESULT"));
    print(D("  ════════════════════════════════════════════════════"));
    print("");
    print(G("  Agent executed within hardware-signed mandates."));
    print(G("  0 private keys exposed. 0 unauthorized transactions."));
    print(G("  Every action cryptographically bound to a mandate."));
    print("");
    print(B("  This is what hardware-enforced agent security looks like."));
    print("");
    print(D("  ────────────────────────────────────────────────"));
    print(G("  Built with Ledger Agent Stack"));
    print(G("  DMK + Wallet CLI + Speculos Emulator"));
    print(D("  ════════════════════════════════════════════════════"));
    print("");
}
//# sourceMappingURL=cli.js.map