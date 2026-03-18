// _app.tsx
import type { AppProps } from 'next/app';
import type { NextPageWithLayout } from '@/types';
import { useState } from 'react';
import Head from 'next/head';
import { Hydrate, QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { ThemeProvider } from 'next-themes';

// Import ProvableHQ Aleo Wallet Adapter dependencies
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';

// Import global styles and wallet modal styles
import 'swiper/swiper-bundle.css';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

import '@/assets/css/globals.css';

import { CURRENT_NETWORK, CURRENT_RPC_URL } from '@/types';
import { ALL_PROGRAMS } from '@/config/programs';
import { WalletPersistence } from '@/components/WalletPersistence';

// Initialize the wallet adapters outside the component
// Currently only Shield Wallet is enabled in the connect modal.
// Leo & Fox adapters are intentionally disabled/hidden for now.
const wallets = [new ShieldWalletAdapter()];

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

function CustomApp({ Component, pageProps }: AppPropsWithLayout) {
  const [queryClient] = useState(() => new QueryClient());
  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <Hydrate state={pageProps.dehydratedState}>
          <AleoWalletProvider
            wallets={wallets}
            autoConnect={false}
            network={Network.TESTNET}
            // Request AUTO_DECRYPT permission so the wallet can automatically
            // decrypt records (e.g. for UserActivity) after the first approval.
            decryptPermission={DecryptPermission.AutoDecrypt}
            // Programs this dApp will interact with via executeTransaction/requestRecords
            programs={ALL_PROGRAMS}
            onError={(error) => console.error(error.message)}
          >
            <WalletPersistence>
            <WalletModalProvider>
              <ThemeProvider attribute="data-theme" enableSystem={true} defaultTheme="dark">
                {getLayout(<Component {...pageProps} />)}
              </ThemeProvider>
            </WalletModalProvider>
            </WalletPersistence>
          </AleoWalletProvider>
        </Hydrate>
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      </QueryClientProvider>
    </>
  );
}

export default CustomApp;
