import { createMandate, hashMandate, } from "./mandate.js";
import { MandateMiddleware } from "./middleware.js";
export class AgentSDK {
    config;
    middleware;
    constructor(config) {
        this.config = config;
        this.middleware = new MandateMiddleware({
            speculosApiPort: config.speculosApiPort,
            speculosApduPort: config.speculosApduPort,
        });
    }
    createCredential(params) {
        const mandate = createMandate({
            agentId: this.config.agentId,
            agentPubkey: this.config.agentPubkey,
            network: this.config.network,
            tokens: params.tokens,
            protocols: params.protocols,
            perTxLimit: params.perTxLimit,
            dailyLimit: params.dailyLimit,
            durationHours: params.durationHours,
            derivationPath: this.config.derivationPath,
        });
        const mandateHash = hashMandate(mandate);
        const credential = {
            agentId: this.config.agentId,
            agentPubkey: this.config.agentPubkey,
            mandateId: mandate.id,
            mandateHash,
            issuedAt: mandate.createdAt,
            expiresAt: mandate.expiresAt,
        };
        const signed = {
            mandate,
            mandateHash,
            signature: null,
            signedBy: "unsigned",
            signedAt: null,
        };
        this.middleware.registerMandate(signed);
        return { mandate, credential };
    }
    signMandate(mandateId) {
        const signed = this.middleware.getMandate(mandateId);
        if (!signed)
            throw new Error(`No mandate found with id ${mandateId}`);
        const updated = {
            ...signed,
            signature: `speculos:signed:${Date.now()}`,
            signedBy: "speculos",
            signedAt: new Date().toISOString(),
        };
        this.middleware.registerMandate(updated);
        return updated;
    }
    async proposeAction(mandateId, action) {
        const result = this.middleware.checkAction(mandateId, action);
        const log = {
            timestamp: new Date().toISOString(),
            mandateId,
            agentId: this.config.agentId,
            action: "transfer",
            target: action.targetAddress ?? "unknown",
            amount: action.amount ?? 0,
            ticker: action.ticker ?? "SOL",
            protocol: action.protocol,
            status: result.allowed ? "approved" : "rejected",
            reason: result.reason,
        };
        this.middleware.logExecution(log);
        return log;
    }
    getCredential(credential) {
        if (new Date(credential.expiresAt) < new Date()) {
            throw new Error("Credential has expired");
        }
        return credential;
    }
    getSpendSummary(mandateId) {
        return this.middleware.getSpendSummary(mandateId);
    }
    getExecutionLog(mandateId) {
        return this.middleware.getExecutionLog(mandateId);
    }
    getActiveMandates() {
        return this.middleware.getActiveMandates();
    }
}
//# sourceMappingURL=agent.js.map