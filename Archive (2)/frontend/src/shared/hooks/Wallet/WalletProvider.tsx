import React, { useMemo } from "react";
import { AleoWalletProvider as ProvableWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletModalProvider } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import {
    DecryptPermission,
} from "@provablehq/aleo-wallet-adaptor-core";
import { Network } from "@provablehq/aleo-types";
import "@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css";
interface AleoWalletProviderProps {
    children: React.ReactNode;
}

export const AleoWalletProvider = ({ children }: AleoWalletProviderProps) => {
    const wallets = useMemo(
        () => [
            new ShieldWalletAdapter({
                appName: 'NullPay'
            }),
        ],
        []
    );

    return (
        <ProvableWalletProvider
            wallets={wallets}
            decryptPermission={DecryptPermission.AutoDecrypt}
            network={Network.TESTNET}
            autoConnect
            programs={['zk_pay_proofs_privacy_v20.aleo', 'credits.aleo', 'test_usdcx_stablecoin.aleo', 'test_usad_stablecoin.aleo']}
        >
            <WalletModalProvider>
                {children}
            </WalletModalProvider>
        </ProvableWalletProvider>
    );
};