export interface CliStatus {
    installed: boolean;
    version: string;
    commands: string[];
    sessionActive: boolean;
    speculosAvailable: boolean;
    deviceConnected: boolean;
    output: string;
}
export declare function checkWalletCli(): Promise<CliStatus>;
export declare function runCliCommand(args: string): Promise<{
    ok: boolean;
    output: string;
}>;
export declare function demoSigningFlow(): Promise<string>;
//# sourceMappingURL=wallet-cli.d.ts.map