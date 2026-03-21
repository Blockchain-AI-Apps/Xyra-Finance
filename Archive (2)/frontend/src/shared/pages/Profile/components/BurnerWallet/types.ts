export interface PrivateBalances {
    ALEO: number;
    USDCx: number;
    USAD: number;
}

export type SweepCurrency = 'ALEO' | 'USDCx' | 'USAD';

export interface BurnerWalletSettingsProps {
    itemVariants: any;
    transactions: any[];
}

export interface ScannerSession {
    scannerBase: string;
    scannerHeaders: Record<string, string>;
    scannerUuid: string;
    account: any;
}
