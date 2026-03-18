import type { NextPageWithLayout } from '@/types';
import Layout from '@/layouts/_layout';
import Link from 'next/link';

const DocsPage: NextPageWithLayout = () => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-12 pt-16 sm:pt-20 space-y-10 text-primary-content">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
          Documentation
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-primary-content">
          Aave‑Aleo Dashboard & Protocol Docs
        </h1>
        <p className="text-base text-primary-content/80 max-w-2xl">
          This page describes how the current Aave‑style lending dashboard on Aleo works:
          wallet behavior, privacy model, transaction flows, Supabase history, and the
          vault backend used for withdraws and borrows.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary-content">1. High‑level overview</h2>
        <div className="rounded-xl bg-base-200 border border-base-300 p-5 space-y-3 text-sm leading-relaxed text-base-content">
          <p>
            The app is an Aave‑style dashboard for the Aleo testnet. It currently supports:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <span className="font-semibold">Two views:</span> <span className="font-mono">Dashboard</span>{' '}
              and <span className="font-mono">Markets</span> as tabs on the same route{' '}
              <span className="font-mono">/dashboard</span>.
            </li>
            <li>
              <span className="font-semibold">Wallet connection</span> via Leo/Shield compatible
              wallets using the Provable wallet adaptor.
            </li>
            <li>
              <span className="font-semibold">Lending pool actions</span> for ALEO and USDCx test
              pools: deposit, withdraw, borrow, repay and interest accrual.
            </li>
            <li>
              <span className="font-semibold">Private data UX:</span> balances and actions are
              treated as private, with clear icons and copy.
            </li>
            <li>
              <span className="font-semibold">Transaction history</span> stored in Supabase and
              fetched by wallet address, including optional vault transfer hashes.
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary-content">2. Wallet behavior</h2>
        <div className="rounded-xl bg-base-200 border border-base-300 p-5 space-y-3 text-sm leading-relaxed text-base-content">
          <ul className="list-disc list-inside space-y-1">
            <li>
              Wallets integrate via{' '}
              <span className="font-mono">@provablehq/aleo-wallet-adaptor-react</span> and the
              <span className="font-mono">WalletMultiButton</span> UI.
            </li>
            <li>
              When connected, the app uses <span className="font-mono">address</span> as the
              public key for:
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>querying the lending pool user position;</li>
                <li>submitting transactions via <span className="font-mono">executeTransaction</span>;</li>
                <li>storing and fetching Supabase transaction history by wallet address.</li>
              </ul>
            </li>
            <li>
              Basic persistence is implemented with <span className="font-mono">sessionStorage</span>{' '}
              so that navigating between Dashboard and Markets does not drop the wallet connection
              state in the UI.
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary-content">3. Dashboard &amp; Markets views</h2>
        <div className="rounded-xl bg-base-200 border border-base-300 p-5 space-y-3 text-sm leading-relaxed text-base-content">
          <ul className="list-disc list-inside space-y-1">
            <li>
              Both views live on <span className="font-mono">/dashboard</span> and are switched
              via context from <span className="font-mono">DashboardViewProvider</span>.
            </li>
            <li>
              <span className="font-semibold">Dashboard</span> shows:
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Overall pool stats (total supplied, total borrowed, utilization, APYs).</li>
                <li>Your supplies, borrows, available balance, and debt.</li>
                <li>Action buttons (Supply, Borrow, Withdraw, Repay) with a shield icon to
                    indicate private operations.</li>
              </ul>
            </li>
            <li>
              <span className="font-semibold">Markets</span> shows:
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Public market data for ALEO and USDCx pools.</li>
                <li>No wallet connect button and no “no wallet required” copy.</li>
              </ul>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary-content">3b. Lending pool programs &amp; APY model</h2>
        <div className="rounded-xl bg-base-200 border border-base-300 p-5 space-y-3 text-sm leading-relaxed text-base-content">
          <p>
            The dashboard talks to <span className="font-mono">two</span> Aleo lending pool programs, one for ALEO
            and one for USDC, both using the same utilization‑based interest and APY model.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <span className="font-semibold">Aleo pool program</span>{' '}
              (<span className="font-mono">lending_pool_v91.aleo</span>): handles ALEO deposits, withdraws,
              borrows, and repays. Program id is configured in{' '}
              <span className="font-mono">src/types/index.ts</span> as{' '}
              <span className="font-mono">BOUNTY_PROGRAM_ID</span>, and the Leo source lives in{' '}
              <span className="font-mono">program/src/main.leo</span>.
            </li>
            <li>
              <span className="font-semibold">USDCx pool program</span>{' '}
              (<span className="font-mono">lending_pool_usdce_v86.aleo</span>): mirrors the same logic for the
              USDCx test token, with scaled balances. Its id is{' '}
              <span className="font-mono">USDC_POOL_PROGRAM_ID</span> in{' '}
              <span className="font-mono">src/types/index.ts</span>, with Leo code in{' '}
              <span className="font-mono">programusdc/src/main.leo</span>.
            </li>
          </ul>

          <p className="pt-2">
            Both programs share the same Aave‑style rate model (documented in{' '}
            <span className="font-mono">program/docs/INTEREST_APY_DESIGN.md</span> and implemented in{' '}
            <span className="font-mono">src/components/aleo/rpc.ts</span>):
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <span className="font-semibold">Utilization</span>{' '}
              <span className="font-mono">u = total_borrowed / total_supplied</span> drives rates
              (0–100%).
            </li>
            <li>
              <span className="font-semibold">Borrow rate per block</span> increases with utilization:
              base rate + slope × <span className="font-mono">u</span>.
            </li>
            <li>
              <span className="font-semibold">Supply rate per block</span> is the borrow rate multiplied
              by utilization and reduced by the reserve factor:
              <span className="font-mono"> supply_rate ≈ borrow_rate × u × (1 − reserve_factor)</span>.
            </li>
            <li>
              <span className="font-semibold">APY</span> is derived from the per‑block rate and the
              expected number of blocks per year (in the frontend we compute
              <span className="font-mono"> borrowAPY</span> and
              <span className="font-mono"> supplyAPY</span> in{' '}
              <span className="font-mono">computeAleoPoolAPY</span> /
              <span className="font-mono">computeUsdcPoolAPY</span>).
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary-content">4. Privacy model in the UI</h2>
        <div className="rounded-xl bg-base-200 border border-base-300 p-5 space-y-3 text-sm leading-relaxed text-base-content">
          <ul className="list-disc list-inside space-y-1">
            <li>
              Columns like <span className="font-mono">Wallet balance</span>,{' '}
              <span className="font-mono">Available</span>,{' '}
              <span className="font-mono">Balance</span>, and{' '}
              <span className="font-mono">Debt</span> are treated as private values.
            </li>
            <li>
              These headers use a <span className="font-mono">PrivateDataColumnHeader</span>{' '}
              component with a shield icon and tooltip explaining that data is private.
            </li>
            <li>
              Action buttons (Supply, Borrow, Withdraw, Repay) use{' '}
              <span className="font-mono">PrivateActionButton</span> to show a shield icon and
              consistent private‑transaction styling.
            </li>
            <li>
              APY tooltips are shown only where helpful (e.g. your supplies / borrows), and not
              repeated in every market row.
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary-content">5. Transaction lifecycle</h2>
        <div className="rounded-xl bg-base-200 border border-base-300 p-5 space-y-3 text-sm leading-relaxed text-base-content">
          <ol className="list-decimal list-inside space-y-2">
            <li>
              User initiates an action (Supply / Borrow / Repay / Withdraw) from the action modal.
            </li>
            <li>
              The app calls the appropriate helper from <span className="font-mono">components/aleo/rpc.ts</span>{' '}
              which uses the wallet&apos;s <span className="font-mono">executeTransaction</span>{' '}
              and returns a temporary transaction id.
            </li>
            <li>
              The UI shows a “Processing…” state while polling{' '}
              <span className="font-mono">transactionStatus(tempId)</span> for a{' '}
              <span className="font-mono">Finalized</span> /{' '}
              <span className="font-mono">Accepted</span> result.
            </li>
            <li>
              When finalized, the code extracts the final on‑chain transaction hash (when
              available) from <span className="font-mono">statusResult.transactionId</span> and
              uses that for:
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>the “View in explorer” link in the modal;</li>
                <li>the “Last transaction” panel at the bottom of the dashboard;</li>
                <li>the main <span className="font-mono">tx_id</span> and{' '}
                    <span className="font-mono">explorer_url</span> stored in Supabase.</li>
              </ul>
            </li>
            <li>
              For <span className="font-semibold">borrow</span> and{' '}
              <span className="font-semibold">withdraw</span>, after the main tx finalizes the
              frontend only saves the row to Supabase (with <span className="font-mono">vault_tx_id</span> null).
              The backend watcher picks up pending rows and performs the vault transfer; no frontend call to the backend is made.
            </li>
          </ol>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary-content">6. Supabase transaction history</h2>
        <div className="rounded-xl bg-base-200 border border-base-300 p-5 space-y-3 text-sm leading-relaxed text-base-content">
          <h3 className="font-semibold">Schema</h3>
          <p>
            Transactions are stored in a single table{' '}
            <span className="font-mono">transaction_history</span> with the most important
            columns:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><span className="font-mono">wallet_address</span> – Aleo address (used for queries).</li>
            <li><span className="font-mono">tx_id</span> – main lending pool tx hash.</li>
            <li><span className="font-mono">type</span> – one of <span className="font-mono">'deposit' | 'withdraw' | 'borrow' | 'repay'</span>.</li>
            <li><span className="font-mono">asset</span> – <span className="font-mono">'aleo'</span> or <span className="font-mono">'usdcx'</span>.</li>
            <li><span className="font-mono">amount</span> – numeric amount (up to 6 decimals).</li>
            <li><span className="font-mono">explorer_url</span> – Provable explorer URL for the main tx.</li>
            <li><span className="font-mono">vault_tx_id</span> – (optional) vault/backend tx id for withdraw/borrow.</li>
            <li><span className="font-mono">vault_explorer_url</span> – (optional) explorer URL for the vault tx.</li>
            <li><span className="font-mono">created_at</span> – server timestamp.</li>
          </ul>
          <p>
            RLS is enabled and the app uses the Supabase{' '}
            <span className="font-mono">Publishable</span> key on the frontend as described in the{' '}
            <span className="font-mono">schema.sql</span> comments. Queries filter by{' '}
            <span className="font-mono">wallet_address</span>.
          </p>

          <h3 className="font-semibold pt-3">Environment variables</h3>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> – project URL from Supabase.
            </li>
            <li>
              <span className="font-mono">NEXT_PUBLIC_SUPABASE_PUB_KEY</span> – Publishable key{' '}
              (<span className="font-mono">sb_publishable_...</span>) used in the browser.
            </li>
          </ul>

          <h3 className="font-semibold pt-3">Frontend behavior</h3>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              On wallet connect, the dashboard fetches{' '}
              <span className="font-mono">/transaction_history</span> rows by{' '}
              <span className="font-mono">wallet_address</span> and shows them in the{' '}
              <span className="font-mono">Transaction history</span> block.
            </li>
            <li>
              Each row shows:
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Date, type, asset, amount.</li>
                <li>
                  A primary link <span className="font-mono">View on Explorer</span> for{' '}
                  <span className="font-mono">explorer_url</span>.
                </li>
                <li>
                  When present, a secondary link{' '}
                  <span className="font-mono">Vault transfer</span> using{' '}
                  <span className="font-mono">vault_explorer_url</span>.
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary-content">7. Vault backend</h2>
        <div className="rounded-xl bg-base-200 border border-base-300 p-5 space-y-3 text-sm leading-relaxed text-base-content">
          <p>
            The vault backend (in <span className="font-mono">backend/</span>) is a small Express
            server that:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Exposes POST endpoints for vault withdraw and borrow for ALEO and USDC.</li>
            <li>Creates transactions using a vault private key and the Provable SDK.</li>
            <li>Awaits the transfer and returns a <span className="font-mono">transactionId</span>{' '}
                to the frontend.</li>
          </ul>
          <p>
            The dashboard uses that <span className="font-mono">transactionId</span> as{' '}
            <span className="font-mono">vault_tx_id</span> and stores its explorer URL in{' '}
            <span className="font-mono">vault_explorer_url</span> so users can inspect the vault
            payouts directly from the Transaction history and the action modal.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-primary-content">8. Development &amp; environment</h2>
        <div className="rounded-xl bg-base-200 border border-base-300 p-5 space-y-3 text-sm leading-relaxed text-base-content">
          <ul className="list-disc list-inside space-y-1">
            <li>
              The app uses <span className="font-mono">NEXT_PUBLIC_APP_ENV</span> to distinguish
              between dev and prod behavior for some UX pieces (e.g. how long certain status
              messages stay visible).
            </li>
            <li>
              Frontend is a Next.js app (Pages router) with Tailwind + DaisyUI styling and a custom
              layout in <span className="font-mono">layouts/_layout.tsx</span>.
            </li>
            <li>
              Wallet integration, pool RPC helpers, Supabase client code, and the vault backend
              are all wired specifically for Aleo testnet and may need configuration changes for
              mainnet.
            </li>
          </ul>

          <p className="text-xs text-base-content/60">
            For more implementation details, see the source files referenced above (e.g.{` `}
            <span className="font-mono">src/pages/dashboard.tsx</span>,{' '}
            <span className="font-mono">supabase/schema.sql</span>, and{' '}
            <span className="font-mono">backend/src/server.js</span>.
          </p>
        </div>
      </section>
    </div>
  );
};

DocsPage.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

export default DocsPage;

