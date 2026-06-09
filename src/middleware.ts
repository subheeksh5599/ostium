import {
  validateMandate,
  type Mandate,
  type SignedMandate,
  type MandateAction,
  type MandateExecutionLog,
} from "./mandate.js";
import { createHash } from "node:crypto";

export interface SpendTracker {
  [mandateId: string]: {
    [date: string]: {
      [ticker: string]: number;
    };
  };
}

export interface MiddlewareConfig {
  speculosApiPort: number;
  speculosApduPort: number;
}

export class MandateMiddleware {
  private mandates: Map<string, SignedMandate> = new Map();
  private spendTracker: SpendTracker = {};
  private executionLog: MandateExecutionLog[] = [];
  private config: MiddlewareConfig;

  constructor(config: Partial<MiddlewareConfig> = {}) {
    this.config = {
      speculosApiPort: config.speculosApiPort ?? 5000,
      speculosApduPort: config.speculosApduPort ?? 40000,
    };
  }

  registerMandate(signed: SignedMandate): void {
    this.mandates.set(signed.mandate.id, signed);
    if (!this.spendTracker[signed.mandate.id]) {
      this.spendTracker[signed.mandate.id] = {};
    }
  }

  getMandate(id: string): SignedMandate | undefined {
    return this.mandates.get(id);
  }

  listMandates(): SignedMandate[] {
    return Array.from(this.mandates.values());
  }

  getActiveMandates(): SignedMandate[] {
    const now = new Date();
    return Array.from(this.mandates.values()).filter(
      (m) => new Date(m.mandate.expiresAt) > now
    );
  }

  checkAction(mandateId: string, action: MandateAction): { allowed: boolean; reason?: string } {
    const signed = this.mandates.get(mandateId);
    if (!signed) {
      return { allowed: false, reason: `No mandate found with id ${mandateId}` };
    }

    const validation = validateMandate(signed.mandate, action);
    if (!validation.valid) {
      return { allowed: false, reason: validation.reason };
    }

    if (action.ticker && action.amount) {
      const today = new Date().toISOString().slice(0, 10);
      const tracker = this.spendTracker[mandateId];
      if (!tracker[today]) tracker[today] = {};
      const dailySpent = (tracker[today][action.ticker] || 0) + action.amount;

      const tokenLimit = signed.mandate.tokens.find(
        (t) => t.ticker.toLowerCase() === action.ticker!.toLowerCase()
      );

      if (tokenLimit && dailySpent > tokenLimit.dailyLimit) {
        return {
          allowed: false,
          reason: `Daily spend ${dailySpent} ${action.ticker} would exceed limit of ${tokenLimit.dailyLimit}`,
        };
      }

      if (signed.mandate.dailyLimit && dailySpent > signed.mandate.dailyLimit) {
        return {
          allowed: false,
          reason: `Daily spend ${dailySpent} ${action.ticker} would exceed global limit of ${signed.mandate.dailyLimit}`,
        };
      }

      if (!tracker[today]) tracker[today] = {};
      tracker[today][action.ticker] = dailySpent;
    }

    return { allowed: true };
  }

  logExecution(entry: MandateExecutionLog): void {
    this.executionLog.push(entry);
  }

  getExecutionLog(mandateId?: string): MandateExecutionLog[] {
    if (mandateId) {
      return this.executionLog.filter((e) => e.mandateId === mandateId);
    }
    return this.executionLog;
  }

  getDailySpend(mandateId: string): { [ticker: string]: number } {
    const today = new Date().toISOString().slice(0, 10);
    return this.spendTracker[mandateId]?.[today] ?? {};
  }

  getSpendSummary(mandateId: string): {
    ticker: string;
    spent: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  }[] {
    const signed = this.mandates.get(mandateId);
    if (!signed) return [];

    const dailySpend = this.getDailySpend(mandateId);

    return signed.mandate.tokens.map((token) => {
      const spent = dailySpend[token.ticker] || 0;
      const limit = token.dailyLimit;
      return {
        ticker: token.ticker,
        spent,
        limit,
        remaining: Math.max(0, limit - spent),
        percentUsed: limit > 0 ? (spent / limit) * 100 : 0,
      };
    });
  }

  computeExecutionDisplay(action: MandateAction): string {
    const lines: string[] = [];
    lines.push("╔═══════════════════════════════════╗");
    lines.push("║   LEDGER — TRANSACTION REVIEW    ║");
    lines.push("╠═══════════════════════════════════╣");

    if (action.ticker) {
      lines.push(`║ Token:    ${action.ticker.padEnd(23)}║`);
    }
    if (action.amount !== undefined) {
      lines.push(`║ Amount:   ${String(action.amount).padEnd(23)}║`);
    }
    if (action.protocol) {
      lines.push(`║ Protocol: ${action.protocol.padEnd(23)}║`);
    }
    if (action.targetAddress) {
      const short =
        action.targetAddress.slice(0, 10) + "..." + action.targetAddress.slice(-6);
      lines.push(`║ To:       ${short.padEnd(23)}║`);
    }

    lines.push("╠═══════════════════════════════════╣");
    lines.push("║  Press both buttons to APPROVE    ║");
    lines.push("║  Press right to REJECT            ║");
    lines.push("╚═══════════════════════════════════╝");

    return lines.join("\n");
  }

  computeSpeculosButtonSequence(
    mandate: Mandate,
    action: MandateAction
  ): string {
    const mandateHash = createHash("sha256")
      .update(JSON.stringify(mandate))
      .digest("hex");

    return JSON.stringify(
      {
        version: 1,
        rules: [
          {
            text: "Review",
            actions: [
              ["button", 1, true],
              ["button", 2, true],
              ["button", 1, false],
              ["button", 2, false],
            ],
          },
          {
            text: "Approve",
            actions: [
              ["button", 1, true],
              ["button", 2, true],
              ["button", 1, false],
              ["button", 2, false],
            ],
          },
          {
            text: "Accept",
            actions: [
              ["button", 1, true],
              ["button", 2, true],
              ["button", 1, false],
              ["button", 2, false],
            ],
          },
        ],
      },
      null,
      2
    );
  }
}
