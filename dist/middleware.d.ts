import { type Mandate, type SignedMandate, type MandateAction, type MandateExecutionLog } from "./mandate.js";
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
export declare class MandateMiddleware {
    private mandates;
    private spendTracker;
    private executionLog;
    private config;
    constructor(config?: Partial<MiddlewareConfig>);
    registerMandate(signed: SignedMandate): void;
    getMandate(id: string): SignedMandate | undefined;
    listMandates(): SignedMandate[];
    getActiveMandates(): SignedMandate[];
    checkAction(mandateId: string, action: MandateAction): {
        allowed: boolean;
        reason?: string;
    };
    logExecution(entry: MandateExecutionLog): void;
    getExecutionLog(mandateId?: string): MandateExecutionLog[];
    getDailySpend(mandateId: string): {
        [ticker: string]: number;
    };
    getSpendSummary(mandateId: string): {
        ticker: string;
        spent: number;
        limit: number;
        remaining: number;
        percentUsed: number;
    }[];
    computeExecutionDisplay(action: MandateAction): string;
    computeSpeculosButtonSequence(mandate: Mandate, action: MandateAction): string;
}
//# sourceMappingURL=middleware.d.ts.map