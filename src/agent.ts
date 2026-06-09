import {
  createMandate,
  hashMandate,
  validateMandate,
  type Mandate,
  type SignedMandate,
  type MandateAction,
  type MandateExecutionLog,
} from "./mandate.js";
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

export class AgentSDK {
  public config: AgentConfig;
  public middleware: MandateMiddleware;

  constructor(config: AgentConfig) {
    this.config = config;
    this.middleware = new MandateMiddleware({
      speculosApiPort: config.speculosApiPort,
      speculosApduPort: config.speculosApduPort,
    });
  }

  createCredential(params: {
    tokens: Mandate["tokens"];
    protocols: Mandate["protocols"];
    perTxLimit: number;
    dailyLimit: number;
    durationHours: number;
  }): { mandate: Mandate; credential: AgentCredential } {
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

    const credential: AgentCredential = {
      agentId: this.config.agentId,
      agentPubkey: this.config.agentPubkey,
      mandateId: mandate.id,
      mandateHash,
      issuedAt: mandate.createdAt,
      expiresAt: mandate.expiresAt,
    };

    const signed: SignedMandate = {
      mandate,
      mandateHash,
      signature: null,
      signedBy: "unsigned",
      signedAt: null,
    };

    this.middleware.registerMandate(signed);

    return { mandate, credential };
  }

  signMandate(mandateId: string): SignedMandate {
    const signed = this.middleware.getMandate(mandateId);
    if (!signed) throw new Error(`No mandate found with id ${mandateId}`);

    const updated: SignedMandate = {
      ...signed,
      signature: `speculos:signed:${Date.now()}`,
      signedBy: "speculos",
      signedAt: new Date().toISOString(),
    };

    this.middleware.registerMandate(updated);
    return updated;
  }

  async proposeAction(
    mandateId: string,
    action: MandateAction
  ): Promise<MandateExecutionLog> {
    const result = this.middleware.checkAction(mandateId, action);

    const log: MandateExecutionLog = {
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

  getCredential(credential: AgentCredential): AgentCredential {
    if (new Date(credential.expiresAt) < new Date()) {
      throw new Error("Credential has expired");
    }
    return credential;
  }

  getSpendSummary(mandateId: string) {
    return this.middleware.getSpendSummary(mandateId);
  }

  getExecutionLog(mandateId?: string) {
    return this.middleware.getExecutionLog(mandateId);
  }

  getActiveMandates() {
    return this.middleware.getActiveMandates();
  }
}
