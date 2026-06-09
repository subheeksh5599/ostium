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
export declare function createMandate(params: {
    agentId: string;
    agentPubkey: string;
    network: Mandate["network"];
    tokens: MandateTokenLimit[];
    protocols: MandateProtocol[];
    perTxLimit: number;
    dailyLimit: number;
    durationHours: number;
    derivationPath: string;
}): Mandate;
export declare function hashMandate(mandate: Mandate): string;
export declare function validateMandate(mandate: Mandate, action: MandateAction): MandateValidation;
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
//# sourceMappingURL=mandate.d.ts.map