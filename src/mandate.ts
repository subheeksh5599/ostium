import { createHash } from "node:crypto";

export interface MandateTokenLimit {
  ticker: string;
  perTxLimit: number;
  dailyLimit: number;
}

export interface MandateProtocol {
  name: string;
  programId?: string;
}

export interface Mandate {
  version: 1;
  id: string;
  agentId: string;
  agentPubkey: string;
  network: "solana:devnet" | "solana:mainnet" | "ethereum:sepolia" | "ethereum:mainnet";
  tokens: MandateTokenLimit[];
  protocols: MandateProtocol[];
  perTxLimit: number;
  dailyLimit: number;
  durationHours: number;
  createdAt: string;
  expiresAt: string;
  derivationPath: string;
}

export interface SignedMandate {
  mandate: Mandate;
  mandateHash: string;
  signature: string | null;
  signedBy: "ledger-device" | "speculos" | "unsigned";
  signedAt: string | null;
}

export interface MandateExecutionLog {
  timestamp: string;
  mandateId: string;
  agentId: string;
  action: string;
  target: string;
  amount: number;
  ticker: string;
  protocol?: string;
  status: "approved" | "rejected";
  reason?: string;
  txHash?: string;
}

export function createMandate(params: {
  agentId: string;
  agentPubkey: string;
  network: Mandate["network"];
  tokens: MandateTokenLimit[];
  protocols: MandateProtocol[];
  perTxLimit: number;
  dailyLimit: number;
  durationHours: number;
  derivationPath: string;
}): Mandate {
  const now = new Date();
  const id = createHash("sha256")
    .update(`${params.agentId}:${params.agentPubkey}:${now.toISOString()}:${Math.random()}`)
    .digest("hex")
    .slice(0, 16);

  return {
    version: 1,
    id,
    agentId: params.agentId,
    agentPubkey: params.agentPubkey,
    network: params.network,
    tokens: params.tokens,
    protocols: params.protocols,
    perTxLimit: params.perTxLimit,
    dailyLimit: params.dailyLimit,
    durationHours: params.durationHours,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + params.durationHours * 60 * 60 * 1000).toISOString(),
    derivationPath: params.derivationPath,
  };
}

export function hashMandate(mandate: Mandate): string {
  const deterministic = JSON.stringify(
    {
      version: mandate.version,
      id: mandate.id,
      agentId: mandate.agentId,
      agentPubkey: mandate.agentPubkey,
      network: mandate.network,
      tokens: mandate.tokens.map((t) => [t.ticker, t.perTxLimit, t.dailyLimit]),
      protocols: mandate.protocols.map((p) => [p.name, p.programId ?? ""]),
      perTxLimit: mandate.perTxLimit,
      dailyLimit: mandate.dailyLimit,
      durationHours: mandate.durationHours,
      createdAt: mandate.createdAt,
      expiresAt: mandate.expiresAt,
      derivationPath: mandate.derivationPath,
    },
    Object.keys(mandate).sort()
  );

  return createHash("sha256").update(deterministic).digest("hex");
}

export function validateMandate(mandate: Mandate, action: MandateAction): MandateValidation {
  const now = new Date();

  if (new Date(mandate.expiresAt) < now) {
    return { valid: false, reason: "Mandate has expired" };
  }

  const ticker = action.ticker;
  if (ticker) {
    const tokenLimit = mandate.tokens.find(
      (t) => t.ticker.toLowerCase() === ticker.toLowerCase()
    );
    if (!tokenLimit) {
      return {
        valid: false,
        reason: `Token ${ticker} not in mandate (allowed: ${mandate.tokens.map((t) => t.ticker).join(", ")})`,
      };
    }

    if (action.amount) {
      if (action.amount > tokenLimit.perTxLimit) {
        return {
          valid: false,
          reason: `Tx amount ${action.amount} ${action.ticker} exceeds per-tx limit of ${tokenLimit.perTxLimit}`,
        };
      }

      if (mandate.perTxLimit && action.amount > mandate.perTxLimit) {
        return {
          valid: false,
          reason: `Tx amount ${action.amount} ${action.ticker} exceeds global per-tx limit of ${mandate.perTxLimit}`,
        };
      }
    }
  }

  if (action.protocol && mandate.protocols.length > 0) {
    const allowed = mandate.protocols.some(
      (p) => p.name.toLowerCase() === action.protocol!.toLowerCase()
    );
    if (!allowed) {
      return {
        valid: false,
        reason: `Protocol ${action.protocol} not in mandate (allowed: ${mandate.protocols.map((p) => p.name).join(", ")})`,
      };
    }
  }

  return { valid: true };
}

export interface MandateAction {
  ticker?: string;
  amount?: number;
  protocol?: string;
  targetAddress?: string;
}

export interface MandateValidation {
  valid: boolean;
  reason?: string;
}
