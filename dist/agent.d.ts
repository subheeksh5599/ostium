import { type Mandate, type SignedMandate, type MandateAction, type MandateExecutionLog } from "./mandate.js";
import { MandateMiddleware } from "./middleware.js";
export interface AgentCredential {
    agentId: string;
    agentPubkey: string;
    mandateId: string;
    mandateHash: string;
    issuedAt: string;
    expiresAt: string;
}
export interface AgentConfig {
    agentId: string;
    agentPubkey: string;
    network: Mandate["network"];
    derivationPath: string;
    speculosApiPort?: number;
    speculosApduPort?: number;
}
export declare class AgentSDK {
    config: AgentConfig;
    middleware: MandateMiddleware;
    constructor(config: AgentConfig);
    createCredential(params: {
        tokens: Mandate["tokens"];
        protocols: Mandate["protocols"];
        perTxLimit: number;
        dailyLimit: number;
        durationHours: number;
    }): {
        mandate: Mandate;
        credential: AgentCredential;
    };
    signMandate(mandateId: string): SignedMandate;
    proposeAction(mandateId: string, action: MandateAction): Promise<MandateExecutionLog>;
    getCredential(credential: AgentCredential): AgentCredential;
    getSpendSummary(mandateId: string): {
        ticker: string;
        spent: number;
        limit: number;
        remaining: number;
        percentUsed: number;
    }[];
    getExecutionLog(mandateId?: string): MandateExecutionLog[];
    getActiveMandates(): SignedMandate[];
}
//# sourceMappingURL=agent.d.ts.map