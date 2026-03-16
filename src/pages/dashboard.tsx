import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import type { NextPageWithLayout } from '@/types';
import Layout from '@/layouts/_layout';
import Link from 'next/link';
import { MarketsView } from '@/components/MarketsView';
import DocsPage from '@/pages/docs';
import { useDashboardView } from '@/contexts/DashboardViewContext';
import Button from '@/components/ui/button';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { PrivateDataColumnHeader } from '@/components/ui/PrivateDataColumnHeader';
import { PrivateActionButton } from '@/components/ui/PrivateActionButton';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Network } from '@provablehq/aleo-types';
import {
  getLendingPoolState,
  getUsdcLendingPoolState,
  lendingDeposit,
  lendingBorrow,
  lendingRepay,
  lendingWithdraw,
  lendingDepositUsdc,
  lendingBorrowUsdc,
  lendingRepayUsdc,
  lendingWithdrawUsdc,
  getSuitableUsdcTokenRecord,
  getPrivateUsdcBalance,
  lendingAccrueInterest,
  lendingAccrueInterestUsdc,
  debugAllRecords,
  LENDING_POOL_PROGRAM_ID,
  USDC_LENDING_POOL_PROGRAM_ID,
  computeAleoPoolAPY,
  computeUsdcPoolAPY,
  getAleoPoolUserEffectivePosition,
  getPrivateCreditsBalance,
} from '@/components/aleo/rpc';
import { frontendLogger } from '@/utils/logger';
import { CURRENT_NETWORK } from '@/types';
import { getSupabaseBrowserClient } from '@/utils/supabase/client';

// Frontend app environment: 'dev' or 'prod' (default to dev for non-production NODE_ENV)
const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV;
const isDevAppEnv = APP_ENV ? APP_ENV === 'dev' : process.env.NODE_ENV !== 'production';

const DashboardPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { view, setView } = useDashboardView();

  // Sync URL to context when landing on /dashboard?view=markets or /dashboard?view=docs
  useEffect(() => {
    if (router.query.view === 'markets') {
      setView('markets');
    } else if (router.query.view === 'docs') {
      setView('docs');
    } else {
      setView('dashboard');
    }
  }, [router.query.view, setView]);

  const {
    address,
    connected,
    connecting,
    executeTransaction,
    transactionStatus,
    requestRecords,
    requestTransactionHistory,
    decrypt,
  } = useWallet();
  const publicKey = address; // Use address as publicKey for compatibility

  // Avoid showing "Connect wallet" immediately after nav from Markets when already connected (adapter may restore state shortly)
  const [allowShowConnectCTA, setAllowShowConnectCTA] = useState(true);
  useEffect(() => {
    if (connected) {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('wallet_connected', '1');
      setAllowShowConnectCTA(true);
      return;
    }
    const hadConnection = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('wallet_connected');
    if (hadConnection) {
      setAllowShowConnectCTA(false);
      const t = setTimeout(() => {
        setAllowShowConnectCTA(true);
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('wallet_connected');
      }, 600);
      return () => clearTimeout(t);
    }
    setAllowShowConnectCTA(true);
  }, [connected]);

  const [amount, setAmount] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [txId, setTxId] = useState<string | null>(null);
  const [vaultWithdrawTxId, setVaultWithdrawTxId] = useState<string | null>(null);
  const [vaultBorrowTxId, setVaultBorrowTxId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showLogsPanel, setShowLogsPanel] = useState<boolean>(false);
  const [logsSummary, setLogsSummary] = useState<any>(null);

  const [totalSupplied, setTotalSupplied] = useState<string | null>(null);
  const [totalBorrowed, setTotalBorrowed] = useState<string | null>(null);
  const [utilizationIndex, setUtilizationIndex] = useState<string | null>(null);
  const [interestIndex, setInterestIndex] = useState<string | null>(null);
  const [liquidityIndex, setLiquidityIndex] = useState<string | null>(null);
  const [borrowIndex, setBorrowIndex] = useState<string | null>(null);
  const [supplyAPY, setSupplyAPY] = useState<number>(0);
  const [borrowAPY, setBorrowAPY] = useState<number>(0);
  const [effectiveUserSupplied, setEffectiveUserSupplied] = useState<number | null>(null);
  const [effectiveUserBorrowed, setEffectiveUserBorrowed] = useState<number | null>(null);
  const [txFinalized, setTxFinalized] = useState<boolean>(false);

  // User position state (from records; effective balance from mappings when available)
  const [userSupplied, setUserSupplied] = useState<string>('0');
  const [userBorrowed, setUserBorrowed] = useState<string>('0');
  const [totalDeposits, setTotalDeposits] = useState<string>('0');
  const [totalWithdrawals, setTotalWithdrawals] = useState<string>('0');
  const [totalBorrows, setTotalBorrows] = useState<string>('0');
  const [totalRepayments, setTotalRepayments] = useState<string>('0');
  const [isFetchingRecords, setIsFetchingRecords] = useState<boolean>(false);
  const [isRefreshingState, setIsRefreshingState] = useState<boolean>(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [privateAleoBalance, setPrivateAleoBalance] = useState<number | null>(null);

  // USDC Pool state (lending_pool_usdce_v86.aleo — v86 interest/APY, effective balances)
  const [totalSuppliedUsdc, setTotalSuppliedUsdc] = useState<string | null>(null);
  const [totalBorrowedUsdc, setTotalBorrowedUsdc] = useState<string | null>(null);
  const [utilizationIndexUsdc, setUtilizationIndexUsdc] = useState<string | null>(null);
  const [liquidityIndexUsdc, setLiquidityIndexUsdc] = useState<string | null>(null);
  const [borrowIndexUsdc, setBorrowIndexUsdc] = useState<string | null>(null);
  const [supplyAPYUsdc, setSupplyAPYUsdc] = useState<number>(0);
  const [borrowAPYUsdc, setBorrowAPYUsdc] = useState<number>(0);
  const [userSuppliedUsdc, setUserSuppliedUsdc] = useState<string>('0');
  const [userBorrowedUsdc, setUserBorrowedUsdc] = useState<string>('0');
  const [effectiveUserSuppliedUsdc, setEffectiveUserSuppliedUsdc] = useState<number | null>(null);
  const [effectiveUserBorrowedUsdc, setEffectiveUserBorrowedUsdc] = useState<number | null>(null);
  const [totalDepositsUsdc, setTotalDepositsUsdc] = useState<string>('0');
  const [totalWithdrawalsUsdc, setTotalWithdrawalsUsdc] = useState<string>('0');
  const [totalBorrowsUsdc, setTotalBorrowsUsdc] = useState<string>('0');
  const [totalRepaymentsUsdc, setTotalRepaymentsUsdc] = useState<string>('0');
  const [isRefreshingUsdcState, setIsRefreshingUsdcState] = useState<boolean>(false);
  const [amountUsdc, setAmountUsdc] = useState<number>(0);
  const [modalAmountInput, setModalAmountInput] = useState<string>('');
  const [amountErrorUsdc, setAmountErrorUsdc] = useState<string | null>(null);
  const [privateUsdcBalance, setPrivateUsdcBalance] = useState<number | null>(null);

  // Action modal (Aave-style: withdraw/deposit/borrow/repay with overview + tx status)
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionModalMode, setActionModalMode] = useState<'withdraw' | 'deposit' | 'borrow' | 'repay'>('withdraw');
  const [actionModalAsset, setActionModalAsset] = useState<'aleo' | 'usdc'>('aleo');
  const [actionModalSubmitted, setActionModalSubmitted] = useState(false);

  // Track if we've already triggered a one-time records permission request for this connection
  const [walletPermissionsInitialized, setWalletPermissionsInitialized] = useState<boolean>(false);
  // Track if we've already loaded the user's position once after wallet connect
  const [userPositionInitialized, setUserPositionInitialized] = useState<boolean>(false);

  // Transaction history from Supabase (by wallet address)
  type TxHistoryRow = {
    id: string;
    tx_id: string;
    type: string;
    asset: string;
    amount: number;
    explorer_url: string | null;
    vault_tx_id: string | null;
    vault_explorer_url: string | null;
    created_at: string;
  };
  const [txHistory, setTxHistory] = useState<TxHistoryRow[]>([]);
  const [txHistoryLoading, setTxHistoryLoading] = useState(false);
  const [txHistoryPage, setTxHistoryPage] = useState(1);

  // Helper to extract a ciphertext string from a generic record object.
  const extractCiphertext = (record: any): string | null => {
    if (!record || typeof record !== 'object') return null;
    for (const key of Object.keys(record)) {
      const lower = key.toLowerCase();
      if (lower.includes('cipher')) {
        const val = (record as any)[key];
        if (typeof val === 'string' && val.trim().length > 0) {
          return val;
        }
      }
    }
    if ((record as any).data && typeof (record as any).data === 'object') {
      return extractCiphertext((record as any).data);
    }
    return null;
  };

  // Helper to parse numeric u64-style fields (e.g. "10u64", "10u64.private") from decrypted text.
  const extractU64FromText = (label: string, text: string): number => {
    if (!text) return 0;
    const regex = new RegExp(`${label}\\s*[:=]\\s*([0-9_]+)u64`, 'i');
    const match = text.match(regex);
    if (!match || !match[1]) return 0;
    const cleaned = match[1].replace(/_/g, '');
    const n = Number(cleaned);
    return Number.isNaN(n) ? 0 : n;
  };

  // Background record fetching function (non-blocking) - memoized with useCallback
  const fetchRecordsInBackground = useCallback(async (programId: string = LENDING_POOL_PROGRAM_ID) => {
    if (!connected || !requestRecords || !publicKey) {
      console.log('📋 fetchRecordsInBackground: Skipping - wallet not connected or requestRecords not available');
      return;
    }

    // Don't fetch if already fetching
    if (isFetchingRecords) {
      console.log('📋 fetchRecordsInBackground: Already fetching, skipping duplicate request');
      return;
    }

    setIsFetchingRecords(true);
    console.log(`📋 fetchRecordsInBackground: Starting background fetch for ${programId}...`);

    try {
      // Step 1: Fetch encrypted records for this user from lending_pool_v8.aleo.
      // We use includePlaintext=false so we explicitly decrypt via decrypt().
      const records = await requestRecords(programId, false);
      console.log(
        `📋 fetchRecordsInBackground: Fetched ${records?.length || 0} records for ${programId}`,
        records,
      );

      if (!records || !Array.isArray(records) || records.length === 0) {
        console.log('📋 fetchRecordsInBackground: No records found yet (may need more time to index)');
        // Reset user position to zero when no records
        setUserSupplied('0');
        setUserBorrowed('0');
        setTotalDeposits('0');
        setTotalWithdrawals('0');
        setTotalBorrows('0');
        setTotalRepayments('0');
        return;
      }

      if (!decrypt) {
        console.warn('📋 fetchRecordsInBackground: decrypt() not available on wallet, cannot compute user position from records.');
        return;
      }

      // Step 2: Decrypt each record's ciphertext and accumulate totals.
      let totalDepositsAccum = 0;
      let totalWithdrawalsAccum = 0;
      let totalBorrowsAccum = 0;
      let totalRepaymentsAccum = 0;

      for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        console.log(`📋 Decrypting record [${i}]`, rec);

        const cipher = extractCiphertext(rec);
        if (!cipher) {
          console.warn(`📋 Record [${i}] has no ciphertext field, skipping.`);
          continue;
        }

        try {
          const decryptedText = await decrypt(cipher);
          console.log(`📋 Decrypted record [${i}] text:`, decryptedText);

          // Try to parse totals directly from decrypted Leo record text.
          totalDepositsAccum += extractU64FromText('total_deposits', decryptedText);
          totalWithdrawalsAccum += extractU64FromText('total_withdrawals', decryptedText);
          totalBorrowsAccum += extractU64FromText('total_borrows', decryptedText);
          totalRepaymentsAccum += extractU64FromText('total_repayments', decryptedText);
        } catch (e: any) {
          console.warn(`📋 Failed to decrypt record [${i}]:`, e?.message || e);
        }
      }

      const netSupplied = Math.max(0, totalDepositsAccum - totalWithdrawalsAccum);
      const netBorrowed = Math.max(0, totalBorrowsAccum - totalRepaymentsAccum);

      // Update state for UI
      setTotalDeposits(String(totalDepositsAccum));
      setTotalWithdrawals(String(totalWithdrawalsAccum));
      setTotalBorrows(String(totalBorrowsAccum));
      setTotalRepayments(String(totalRepaymentsAccum));
      setUserSupplied(String(netSupplied));
      setUserBorrowed(String(netBorrowed));

      console.log('📋 fetchRecordsInBackground: User position updated from decrypted records', {
        totalDepositsAccum,
        totalWithdrawalsAccum,
        totalBorrowsAccum,
        totalRepaymentsAccum,
        netSupplied,
        netBorrowed,
      });
    } catch (error: any) {
      // Silently handle errors in background fetch (don't spam user)
      console.warn('📋 fetchRecordsInBackground: Error fetching records (non-critical):', error?.message);
    } finally {
      setIsFetchingRecords(false);
      console.log('📋 fetchRecordsInBackground: Background fetch completed');
    }
  }, [connected, requestRecords, publicKey, decrypt, isFetchingRecords]);

  // Fetch user position for USDC pool (lending_pool_usdce_v85.aleo) — same UserActivity record shape.
  const fetchRecordsInBackgroundUsdc = useCallback(async () => {
    if (!connected || !requestRecords || !publicKey) return;
    if (isFetchingRecords) return;
    setIsFetchingRecords(true);
    try {
      const records = await requestRecords(USDC_LENDING_POOL_PROGRAM_ID, false);
      if (!records || !Array.isArray(records) || records.length === 0) {
        setUserSuppliedUsdc('0');
        setUserBorrowedUsdc('0');
        setTotalDepositsUsdc('0');
        setTotalWithdrawalsUsdc('0');
        setTotalBorrowsUsdc('0');
        setTotalRepaymentsUsdc('0');
        return;
      }
      if (!decrypt) return;
      let totalDepositsAccum = 0;
      let totalWithdrawalsAccum = 0;
      let totalBorrowsAccum = 0;
      let totalRepaymentsAccum = 0;
      for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        const cipher = extractCiphertext(rec);
        if (!cipher) continue;
        try {
          const decryptedText = await decrypt(cipher);
          totalDepositsAccum += extractU64FromText('total_deposits', decryptedText);
          totalWithdrawalsAccum += extractU64FromText('total_withdrawals', decryptedText);
          totalBorrowsAccum += extractU64FromText('total_borrows', decryptedText);
          totalRepaymentsAccum += extractU64FromText('total_repayments', decryptedText);
        } catch {
          // skip
        }
      }
      const netSupplied = Math.max(0, totalDepositsAccum - totalWithdrawalsAccum);
      const netBorrowed = Math.max(0, totalBorrowsAccum - totalRepaymentsAccum);
      setTotalDepositsUsdc(String(totalDepositsAccum));
      setTotalWithdrawalsUsdc(String(totalWithdrawalsAccum));
      setTotalBorrowsUsdc(String(totalBorrowsAccum));
      setTotalRepaymentsUsdc(String(totalRepaymentsAccum));
      setUserSuppliedUsdc(String(netSupplied));
      setUserBorrowedUsdc(String(netBorrowed));
    } catch (error: any) {
      console.warn('fetchRecordsInBackgroundUsdc:', error?.message);
    } finally {
      setIsFetchingRecords(false);
    }
  }, [connected, requestRecords, publicKey, decrypt, isFetchingRecords]);

  // Fetch all user records (both credits.aleo and lending_pool_v8.aleo)
  const fetchAllUserRecords = useCallback(async () => {
    if (!connected || !requestRecords || !publicKey) {
      console.log('📋 fetchAllUserRecords: Skipping - wallet not connected');
      return;
    }

    if (isFetchingRecords) {
      console.log('📋 fetchAllUserRecords: Already fetching, skipping');
      return;
    }

    setIsFetchingRecords(true);
    console.log('📋 fetchAllUserRecords: Fetching all user records on refresh...');

    try {
      // Fetch credits.aleo records
      try {
        const creditsRecords = await requestRecords('credits.aleo', false);
        console.log(`📋 fetchAllUserRecords: Fetched ${creditsRecords?.length || 0} credits.aleo records`);
      } catch (error: any) {
        console.warn('📋 fetchAllUserRecords: Error fetching credits.aleo records:', error?.message);
      }

      // Fetch lending_pool_v8.aleo records and update user position
      await fetchRecordsInBackground(LENDING_POOL_PROGRAM_ID);
      
      console.log('📋 fetchAllUserRecords: All records fetched successfully');
    } catch (error: any) {
      console.warn('📋 fetchAllUserRecords: Error fetching records:', error?.message);
    } finally {
      setIsFetchingRecords(false);
    }
  }, [connected, requestRecords, publicKey, fetchRecordsInBackground, isFetchingRecords]);

  // Format scaled indices (SCALE = 1_000_000 in the Leo program) as human-friendly decimals.
  const formatScaled = (value: string | null, decimals = 6) => {
    if (!value) return '0';
    const n = Number(value);
    if (Number.isNaN(n)) return value;
    return (n / 1_000_000).toFixed(decimals);
  };

  // Format micro-ALEO (u64 from program) as ALEO with given decimals (default 2).
  const formatAleoAmount = (micro: number | string | null, decimals = 2) => {
    if (micro == null) return (0).toFixed(decimals);
    const n = typeof micro === 'string' ? Number(micro) : micro;
    if (!Number.isFinite(n)) return (0).toFixed(decimals);
    return (n / 1_000_000).toFixed(decimals);
  };

  const isExplorerHash = (id: string | null) => !!id && id.length >= 61;

  const getErrorMessage = (e: unknown): string => {
    if (e == null) return 'Unknown error';
    const err = e as Record<string, unknown>;
    const msg =
      typeof err?.message === 'string'
        ? err.message
        : typeof (err?.data as any)?.message === 'string'
          ? (err.data as { message: string }).message
          : typeof err?.reason === 'string'
            ? err.reason
            : typeof err?.error === 'string'
              ? err.error
              : typeof err?.toString === 'function'
                ? err.toString()
                : String(e);
    return msg || 'Unknown error';
  };

  const openActionModal = (mode: 'withdraw' | 'deposit' | 'borrow' | 'repay', asset: 'aleo' | 'usdc', prefilledAmount?: number) => {
    setActionModalMode(mode);
    setActionModalAsset(asset);
    setActionModalSubmitted(false);
    setStatusMessage('');
    setAmountError(null);
    setAmountErrorUsdc(null);
    setTxId(null);
    setTxFinalized(false);
    setVaultWithdrawTxId(null);
    setVaultBorrowTxId(null);
    if (prefilledAmount != null) {
      setModalAmountInput(String(prefilledAmount));
      if (asset === 'usdc') setAmountUsdc(prefilledAmount);
      else setAmount(prefilledAmount);
    } else {
      setModalAmountInput('');
    }
    setActionModalOpen(true);
  };

  const closeActionModal = () => {
    setActionModalOpen(false);
    setActionModalSubmitted(false);
  };

  // Derived user metrics for interest display (Aleo pool)
  const INDEX_SCALE_ALEO = 1_000_000_000_000;
  const numericTotalDeposits = Number(totalDeposits) || 0;
  const numericTotalWithdrawals = Number(totalWithdrawals) || 0;
  const numericTotalBorrows = Number(totalBorrows) || 0;
  const numericTotalRepayments = Number(totalRepayments) || 0;
  const principalSupplied = Math.max(0, numericTotalDeposits - numericTotalWithdrawals);
  const principalBorrowed = Math.max(0, numericTotalBorrows - numericTotalRepayments);
  const effectiveSuppliedVal =
    effectiveUserSupplied != null ? effectiveUserSupplied : Number(userSupplied) || 0;
  const effectiveBorrowedVal =
    effectiveUserBorrowed != null ? effectiveUserBorrowed : Number(userBorrowed) || 0;
  const liNum = liquidityIndex != null ? Number(liquidityIndex) : null;
  const biNum = borrowIndex != null ? Number(borrowIndex) : null;
  const liFactor =
    liNum != null && Number.isFinite(liNum) && liNum > 0
      ? liNum / INDEX_SCALE_ALEO
      : 1;
  const biFactor =
    biNum != null && Number.isFinite(biNum) && biNum > 0
      ? biNum / INDEX_SCALE_ALEO
      : 1;
  // Approximate interest using indices (can show fractional ALEO even before whole-token accrual),
  // falling back to effective-minus-principal if indices are unavailable.
  const interestEarnedAleo =
    principalSupplied > 0 && liFactor > 1
      ? Math.max(0, principalSupplied * (liFactor - 1))
      : Math.max(0, effectiveSuppliedVal - principalSupplied);
  const interestOwedAleo =
    principalBorrowed > 0 && biFactor > 1
      ? Math.max(0, principalBorrowed * (biFactor - 1))
      : Math.max(0, effectiveBorrowedVal - principalBorrowed);

  // Derived user metrics for interest display (USDC pool)
  const INDEX_SCALE_USDC = 1_000_000_000_000;
  const USDC_SCALE = 1_000_000;
  const numericTotalDepositsUsdc = Number(totalDepositsUsdc) || 0;
  const numericTotalWithdrawalsUsdc = Number(totalWithdrawalsUsdc) || 0;
  const numericTotalBorrowsUsdc = Number(totalBorrowsUsdc) || 0;
  const numericTotalRepaymentsUsdc = Number(totalRepaymentsUsdc) || 0;
  const principalSuppliedUsdc = Math.max(0, numericTotalDepositsUsdc - numericTotalWithdrawalsUsdc);
  const principalBorrowedUsdc = Math.max(0, numericTotalBorrowsUsdc - numericTotalRepaymentsUsdc);
  const effectiveSuppliedUsdcVal =
    effectiveUserSuppliedUsdc != null ? effectiveUserSuppliedUsdc : Number(userSuppliedUsdc) || 0;
  const effectiveBorrowedUsdcVal =
    effectiveUserBorrowedUsdc != null ? effectiveUserBorrowedUsdc : Number(userBorrowedUsdc) || 0;
  const liUsdcNum = liquidityIndexUsdc != null ? Number(liquidityIndexUsdc) : null;
  const biUsdcNum = borrowIndexUsdc != null ? Number(borrowIndexUsdc) : null;
  const liUsdcFactor =
    liUsdcNum != null && Number.isFinite(liUsdcNum) && liUsdcNum > 0
      ? liUsdcNum / INDEX_SCALE_USDC
      : 1;
  const biUsdcFactor =
    biUsdcNum != null && Number.isFinite(biUsdcNum) && biUsdcNum > 0
      ? biUsdcNum / INDEX_SCALE_USDC
      : 1;
  const interestEarnedUsdcMicro =
    principalSuppliedUsdc > 0 && liUsdcFactor > 1
      ? Math.max(0, principalSuppliedUsdc * (liUsdcFactor - 1))
      : Math.max(0, effectiveSuppliedUsdcVal - principalSuppliedUsdc);
  const interestOwedUsdcMicro =
    principalBorrowedUsdc > 0 && biUsdcFactor > 1
      ? Math.max(0, principalBorrowedUsdc * (biUsdcFactor - 1))
      : Math.max(0, effectiveBorrowedUsdcVal - principalBorrowedUsdc);
  const interestEarnedUsdc =
    interestEarnedUsdcMicro > 0 ? interestEarnedUsdcMicro / USDC_SCALE : 0;
  const interestOwedUsdc =
    interestOwedUsdcMicro > 0 ? interestOwedUsdcMicro / USDC_SCALE : 0;

  // Per-asset tooltips: supply = interest earned, borrow = interest owed (real calculated values)
  const tooltipInterestEarnedAleo = `Interest earned (ALEO): ${formatAleoAmount(interestEarnedAleo, 6)}`;
  const tooltipInterestEarnedUsdc = `Interest earned (USDC): ${interestEarnedUsdc.toFixed(6)} USDC`;
  const tooltipInterestOwedAleo = `Interest owed (ALEO): ${formatAleoAmount(interestOwedAleo, 6)}`;
  const tooltipInterestOwedUsdc = `Interest owed (USDC): ${interestOwedUsdc.toFixed(6)} USDC`;

  const getExplorerTxUrl = (id: string) => {
    let base = 'https://explorer.aleo.org/transaction';

    if (CURRENT_NETWORK === Network.TESTNET) {
      base = 'https://testnet.explorer.aleo.org/transaction';
    }

    // If you later switch to MainnetBeta explicitly, you can add a branch here.
    return `${base}/${id}`;
  };

  const getProvableExplorerTxUrl = (id: string) =>
    `https://testnet.explorer.provable.com/transaction/${id}`;

  const [txHistoryError, setTxHistoryError] = useState<string | null>(null);

  const fetchTransactionHistory = useCallback(async () => {
    if (!address?.trim()) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setTxHistoryError('Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUB_KEY to .env');
      setTxHistory([]);
      return;
    }
    setTxHistoryLoading(true);
    setTxHistoryError(null);
    try {
      const { data, error } = await supabase
        .from('transaction_history')
        .select('id, wallet_address, tx_id, type, asset, amount, program_id, explorer_url, vault_tx_id, vault_explorer_url, created_at')
        .eq('wallet_address', address)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        setTxHistoryError(error.message);
        setTxHistory([]);
        return;
      }
      setTxHistory(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.warn('Failed to fetch transaction history:', e);
      setTxHistoryError(e?.message || 'Network error');
      setTxHistory([]);
    } finally {
      setTxHistoryLoading(false);
    }
  }, [address]);

  const saveTransactionToSupabase = async (
    walletAddress: string,
    txId: string,
    type: 'deposit' | 'withdraw' | 'borrow' | 'repay',
    asset: 'aleo' | 'usdc',
    amount: number,
    programId?: string,
    _vaultTxId?: string | null,
  ) => {
    try {
      const res = await fetch('/api/record-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
          tx_id: txId,
          type,
          asset: asset === 'usdc' ? 'usdcx' : asset,
          amount,
          program_id: programId ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        console.warn('Save transaction failed:', err?.error || res.statusText);
        return;
      }
      await fetchTransactionHistory();
    } catch (e) {
      console.warn('Failed to save transaction:', e);
    }
  };

  const refreshPoolState = async (includeUserPosition: boolean = false) => {
    try {
      setIsRefreshingState(true);
      const state = await getLendingPoolState();
      setTotalSupplied(state.totalSupplied ?? '0');
      setTotalBorrowed(state.totalBorrowed ?? '0');
      setUtilizationIndex(state.utilizationIndex ?? '0');
      setInterestIndex(state.interestIndex ?? '0');
      setLiquidityIndex(state.liquidityIndex ?? null);
      setBorrowIndex(state.borrowIndex ?? null);
      const ts = Number(state.totalSupplied ?? 0) || 0;
      const tb = Number(state.totalBorrowed ?? 0) || 0;
      const { supplyAPY: sApy, borrowAPY: bApy } = computeAleoPoolAPY(ts, tb);
      setSupplyAPY(sApy);
      setBorrowAPY(bApy);

      if (includeUserPosition && publicKey) {
        try {
          await fetchRecordsInBackground(LENDING_POOL_PROGRAM_ID);
          const effective = await getAleoPoolUserEffectivePosition(LENDING_POOL_PROGRAM_ID, publicKey);
          if (effective) {
            setEffectiveUserSupplied(effective.effectiveSupplyBalance);
            setEffectiveUserBorrowed(effective.effectiveBorrowDebt);
          } else {
            setEffectiveUserSupplied(null);
            setEffectiveUserBorrowed(null);
          }
          if (requestRecords) {
            getPrivateCreditsBalance(requestRecords, decrypt).then(setPrivateAleoBalance).catch(() => setPrivateAleoBalance(null));
          }
        } catch (error) {
          console.warn('Failed to refresh user position from records:', error);
          setUserSupplied('0');
          setUserBorrowed('0');
          setTotalDeposits('0');
          setTotalWithdrawals('0');
          setTotalBorrows('0');
          setTotalRepayments('0');
          setEffectiveUserSupplied(null);
          setEffectiveUserBorrowed(null);
        }
      } else {
        setUserSupplied('0');
        setUserBorrowed('0');
        setTotalDeposits('0');
        setTotalWithdrawals('0');
        setTotalBorrows('0');
        setTotalRepayments('0');
        setEffectiveUserSupplied(null);
        setEffectiveUserBorrowed(null);
        setPrivateAleoBalance(null);
      }
    } catch (e) {
      console.error('Failed to fetch pool state', e);
      setStatusMessage('Failed to fetch pool state. Check console for details.');
    }
    finally {
      setIsRefreshingState(false);
    }
  };

  const refreshUsdcPoolState = async (includeUserPosition: boolean = false) => {
    try {
      setIsRefreshingUsdcState(true);
      const state = await getUsdcLendingPoolState();
      setTotalSuppliedUsdc(state.totalSupplied ?? '0');
      setTotalBorrowedUsdc(state.totalBorrowed ?? '0');
      setUtilizationIndexUsdc(state.utilizationIndex ?? '0');
      setLiquidityIndexUsdc(state.liquidityIndex ?? null);
      setBorrowIndexUsdc(state.borrowIndex ?? null);
      const ts = Number(state.totalSupplied ?? 0) || 0;
      const tb = Number(state.totalBorrowed ?? 0) || 0;
      const { supplyAPY: sApy, borrowAPY: bApy } = computeUsdcPoolAPY(ts, tb);
      setSupplyAPYUsdc(sApy);
      setBorrowAPYUsdc(bApy);
      if (includeUserPosition && requestRecords && publicKey) {
        try {
          await fetchRecordsInBackgroundUsdc();
          const effective = await getAleoPoolUserEffectivePosition(USDC_LENDING_POOL_PROGRAM_ID, publicKey);
          if (effective) {
            setEffectiveUserSuppliedUsdc(effective.effectiveSupplyBalance);
            setEffectiveUserBorrowedUsdc(effective.effectiveBorrowDebt);
          } else {
            setEffectiveUserSuppliedUsdc(null);
            setEffectiveUserBorrowedUsdc(null);
          }
          getPrivateUsdcBalance(requestRecords, decrypt).then(setPrivateUsdcBalance).catch(() => setPrivateUsdcBalance(null));
        } catch (error) {
          console.warn('Failed to refresh USDC user position:', error);
          setUserSuppliedUsdc('0');
          setUserBorrowedUsdc('0');
          setTotalDepositsUsdc('0');
          setTotalWithdrawalsUsdc('0');
          setTotalBorrowsUsdc('0');
          setTotalRepaymentsUsdc('0');
          setEffectiveUserSuppliedUsdc(null);
          setEffectiveUserBorrowedUsdc(null);
          setPrivateUsdcBalance(null);
        }
      } else {
        setEffectiveUserSuppliedUsdc(null);
        setEffectiveUserBorrowedUsdc(null);
        setPrivateUsdcBalance(null);
      }
    } catch (e) {
      console.error('Failed to fetch USDC pool state', e);
    } finally {
      setIsRefreshingUsdcState(false);
    }
  };

  // One-time pool state fetch on page load/refresh and when wallet connects.
  // This DOES NOT touch private records / requestRecords to avoid extra wallet prompts.
  useEffect(() => {
    refreshPoolState(false);
    refreshUsdcPoolState(false);
  }, [publicKey, connected]);

  // When wallet connects, trigger a ONE-TIME broad records request to get permissions up front.
  // This will show the wallet permission popup once per connection, then we rely on manual refresh.
  useEffect(() => {
    if (!connected || !publicKey || !requestRecords) {
      // Reset flag on disconnect so next connection can re-initialize
      if (!connected && walletPermissionsInitialized) {
        setWalletPermissionsInitialized(false);
      }
      if (!connected && userPositionInitialized) {
        setUserPositionInitialized(false);
      }
      return;
    }

    if (walletPermissionsInitialized) return;

    (async () => {
      try {
        console.log('🔐 Initializing wallet record permissions (one-time request)...');
        // Some wallets do not allow an empty program string. Instead, request for
        // the specific programs this dApp cares about so the user sees at most
        // one prompt per program.
        try {
          await requestRecords(LENDING_POOL_PROGRAM_ID, false);
          console.log(`✅ Wallet record permissions initialized for ${LENDING_POOL_PROGRAM_ID}`);
        } catch (e: any) {
          console.warn(
            `⚠️ Failed to pre-initialize permissions for ${LENDING_POOL_PROGRAM_ID}:`,
            e?.message,
          );
        }
        try {
          await requestRecords(USDC_LENDING_POOL_PROGRAM_ID, false);
          console.log(`✅ Wallet record permissions initialized for ${USDC_LENDING_POOL_PROGRAM_ID}`);
        } catch (e: any) {
          console.warn(`⚠️ Failed to pre-initialize permissions for ${USDC_LENDING_POOL_PROGRAM_ID}:`, e?.message);
        }
        try {
          await requestRecords('credits.aleo', false);
          console.log('✅ Wallet record permissions initialized for credits.aleo');
        } catch (e: any) {
          console.warn('⚠️ Failed to pre-initialize permissions for credits.aleo:', e?.message);
        }
      } finally {
        setWalletPermissionsInitialized(true);
      }
    })();
  }, [connected, publicKey, requestRecords, walletPermissionsInitialized, userPositionInitialized]);

  // After wallet is connected and permissions are initialized, load the user's
  // position once automatically (Your Position / Activity Totals).
  useEffect(() => {
    if (!connected || !publicKey || !requestRecords) {
      return;
    }
    if (!walletPermissionsInitialized) {
      // Wait until we've done the initial record-permission request
      return;
    }
    if (userPositionInitialized) {
      return;
    }

    (async () => {
      try {
        await refreshPoolState(true);
        await refreshUsdcPoolState(true);
      } finally {
        setUserPositionInitialized(true);
      }
    })();
  }, [connected, publicKey, requestRecords, walletPermissionsInitialized, userPositionInitialized]);

  // Load transaction history from Supabase when wallet address is available
  useEffect(() => {
    if (address?.trim()) {
      fetchTransactionHistory();
    } else {
      setTxHistory([]);
    }
  }, [address, fetchTransactionHistory]);

  // Auto-refresh transaction history every 1 min (e.g. to show vault_tx_id when backend completes)
  useEffect(() => {
    if (!address?.trim()) return;
    const interval = setInterval(() => fetchTransactionHistory(), 60_000);
    return () => clearInterval(interval);
  }, [address, fetchTransactionHistory]);

  const handleAction = async (action: 'deposit' | 'borrow' | 'repay' | 'withdraw') => {
    if (!connected) {
      const error = 'Please connect your wallet first.';
      setStatusMessage(error);
      console.error('❌ VALIDATION FAILED: Wallet not connected');
      console.log('========================================\n');
      return;
    }
    
    if (!publicKey) {
      const error = 'Public key not available. Please reconnect your wallet.';
      setStatusMessage(error);
      console.error('❌ VALIDATION FAILED: Public key not available');
      console.log('========================================\n');
      return;
    }
    
    try {
      setLoading(true);
      setStatusMessage(`Executing ${action}...`);
      setAmountError(null);
      
      if (amount <= 0) {
        throw new Error('Amount must be greater than zero.');
      }

      // First check for deposit/repay: private Aleo balance must be at least the input amount
      if (action === 'deposit' || action === 'repay') {
        let balance = privateAleoBalance;
        if (balance === null && requestRecords) {
          balance = await getPrivateCreditsBalance(requestRecords, decrypt);
          setPrivateAleoBalance(balance);
        }
        if (amount > (balance ?? 0)) {
          const msg = `Insufficient private Aleo. Your balance: ${(Math.floor((balance ?? 0) * 100) / 100).toFixed(2)} credits.`;
          setAmountError(msg);
          setStatusMessage(msg);
          setLoading(false);
          return;
        }
      }

      // Frontend limit checks (Aleo pool):
      // Program and mappings use micro-ALEO (u64). Convert to ALEO (credits) for comparisons with `amount`.
      const netSuppliedMicro = effectiveUserSupplied ?? (Number(userSupplied) || 0);
      const netBorrowedMicro = effectiveUserBorrowed ?? (Number(userBorrowed) || 0);
      const poolSuppliedMicro = Number(totalSupplied) || 0;
      const poolBorrowedMicro = Number(totalBorrowed) || 0;

      const netSupplied = netSuppliedMicro / 1_000_000; // ALEO
      const netBorrowed = netBorrowedMicro / 1_000_000; // ALEO
      const availableLiquidity = Math.max(
        0,
        (poolSuppliedMicro - poolBorrowedMicro) / 1_000_000,
      ); // ALEO
      // When pool state is not loaded (totalSupplied 0), allow withdraw up to user position; program will enforce liquidity
      const poolStateLoaded = poolSuppliedMicro > 0 || poolBorrowedMicro > 0;
      const maxWithdrawable = poolStateLoaded
        ? Math.min(netSupplied, availableLiquidity)
        : netSupplied;

      if (action === 'withdraw' && amount > maxWithdrawable) {
        const msg = poolStateLoaded && availableLiquidity < netSupplied
          ? `You can withdraw at most ${maxWithdrawable.toFixed(
              2,
            )} ALEO (available pool liquidity). Your position is ${netSupplied.toFixed(
              2,
            )} ALEO but only ${availableLiquidity.toFixed(2)} ALEO is free for withdrawal.`
          : `You can withdraw at most ${netSupplied.toFixed(
              2,
            )} ALEO from your current position.`;
        setAmountError(msg);
        setStatusMessage(msg);
        setLoading(false);
        return;
      }

      if (action === 'repay' && amount > netBorrowed) {
        const msg = `You need to repay at most ${netBorrowed.toFixed(
          2,
        )} ALEO to fully clear your debt.`;
        setAmountError(msg);
        setStatusMessage(msg);
        setLoading(false);
        return;
      }

      if (action === 'borrow' && poolStateLoaded && amount > availableLiquidity) {
        const msg = `Borrow amount exceeds available pool liquidity (${availableLiquidity.toFixed(2)} ALEO). Please reduce the amount.`;
        setAmountError(msg);
        setStatusMessage(msg);
        setLoading(false);
        return;
      }

      setActionModalSubmitted(true);
      let tx: string;
      const startTime = Date.now();

      // v7: Contract reads user data from mappings automatically - only amount needed
      console.log(`🔄 Executing ${action} transaction...`);
      switch (action) {
        case 'deposit':
          console.log('💰 DEPOSIT: Starting deposit transaction (executeTransaction)...');
          tx = await lendingDeposit(
            executeTransaction,
            amount,
            publicKey || undefined,
            requestRecords,
            decrypt,
          );
          console.log('💰 DEPOSIT: Transaction submitted successfully:', tx);
          break;
        case 'borrow':
          console.log('📥 BORROW: Starting borrow transaction (executeTransaction)...');
          setVaultBorrowTxId(null);
          tx = await lendingBorrow(executeTransaction, amount);
          console.log('📥 BORROW: Transaction submitted successfully:', tx);
          break;
        case 'repay':
          console.log('💳 REPAY: Starting repay_with_credits transaction (executeTransaction)...');
          tx = await lendingRepay(
            executeTransaction,
            amount,
            publicKey || undefined,
            requestRecords,
            decrypt,
          );
          console.log('💳 REPAY: Transaction submitted successfully:', tx);
          break;
        case 'withdraw':
          console.log('💸 WITHDRAW: Starting withdraw transaction (executeTransaction)...');
          setVaultWithdrawTxId(null);
          tx = await lendingWithdraw(executeTransaction, amount);
          console.log('💸 WITHDRAW: Transaction submitted successfully:', tx);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // If wallet action was cancelled, upstream helper returns sentinel value.
      if (tx === '__CANCELLED__') {
        console.log(`💡 ${action.toUpperCase()} transaction was cancelled by user (no error).`);
        setStatusMessage('Transaction cancelled by user.');
        if (!isDevAppEnv) {
          setTimeout(() => setStatusMessage(''), 2500);
        }
        setLoading(false);
        console.log('========================================\n');
        return;
      }

      const transactionTime = Date.now() - startTime;
      console.log(`⏱️ Transaction submitted in ${transactionTime}ms`);

      setTxId(null);
      setTxFinalized(false);
      setStatusMessage('Transaction submitted. Waiting for finalization…');
      
      console.log('📤 Transaction ID:', tx);
      console.log('⏳ Starting finalization polling...');

      // Poll for transaction finalization; then save to Supabase (withdraw/borrow). Backend watcher performs vault transfer.
      let finalized = false;
      let txFailed = false;
      let finalTxId = tx; // use final on-chain id (at1...) for explorer and Supabase, not the initial shield id
      const maxAttempts = 45;
      const delayMs = 2000;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`🔄 Polling transaction status (attempt ${attempt}/${maxAttempts})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        if (transactionStatus) {
          try {
            const statusResult = await transactionStatus(tx);
            console.log(`📊 Transaction status (attempt ${attempt}):`, statusResult);

            const statusText =
              typeof statusResult === 'string'
                ? statusResult
                : (statusResult as any)?.status ?? '';
            const statusLower = (statusText || '').toLowerCase();

            if (statusLower === 'finalized' || statusLower === 'accepted') {
              finalized = true;
              console.log('✅ Transaction finalized!', statusResult);
              const resolvedId =
                (typeof statusResult === 'object' && (statusResult as any).transactionId) || tx;
              finalTxId = resolvedId;
              setTxId(isExplorerHash(resolvedId) ? resolvedId : null);
              break;
            }
            if (statusLower === 'rejected' || statusLower === 'failed' || statusLower === 'dropped') {
              txFailed = true;
              setStatusMessage(`Transaction ${statusLower}. Vault transfer was not requested.`);
              setLoading(false);
              console.log('========================================\n');
              return;
            }
            setStatusMessage(`Transaction ${statusText || 'pending'}... (attempt ${attempt}/${maxAttempts})`);
          } catch (e) {
            console.warn(`⚠️ Failed to check transaction status (attempt ${attempt}):`, e);
          }
        } else {
          if (attempt === maxAttempts) {
            finalized = true;
            console.log('⏰ Max attempts reached, assuming finalized');
          }
        }
      }

      if (txFailed) {
        setLoading(false);
        console.log('========================================\n');
        return;
      }
      if (!finalized) {
        setStatusMessage(
          'Transaction not finalized in time. Please check the explorer. Backend will process vault transfer once it is finalized.'
        );
        setLoading(false);
        console.log('========================================\n');
        return;
      }

      setTxFinalized(true);
      console.log('✅ Transaction finalized successfully!');

      if (action === 'deposit' || action === 'repay') {
        if (publicKey) {
          saveTransactionToSupabase(
            publicKey,
            finalTxId,
            action,
            'aleo',
            amount,
            LENDING_POOL_PROGRAM_ID
          )
            .then(() => fetchTransactionHistory())
            .catch(() => {});
        }
      }

      // After finalization: save one record (vault_tx_id null). Backend watcher picks it up and performs vault transfer; no frontend call.
      if (action === 'withdraw' || action === 'borrow') {
        if (publicKey) {
          await saveTransactionToSupabase(
            publicKey,
            finalTxId,
            action,
            'aleo',
            amount,
            LENDING_POOL_PROGRAM_ID,
            null
          ).catch(() => {});
          fetchTransactionHistory();
        }
      }

      setAmount(0);
      console.log('📋 Refreshing pool and user position after transaction finalization...');
      try {
        await refreshPoolState(true);
        if (action === 'withdraw' || action === 'borrow') {
          setStatusMessage('Transaction finalized! Vault transfer will be done in 1–5 min — check status in Transaction History.');
        } else {
          setStatusMessage('Transaction finalized! Pool and position have been refreshed.');
        }
        if (!isDevAppEnv) setTimeout(() => setStatusMessage(''), 5000);
      } catch (refreshError) {
        console.warn('⚠️ Failed to refresh pool state after transaction:', refreshError);
        setStatusMessage('Transaction finalized, but automatic refresh failed. Please click Refresh to update.');
      }
      console.log('✅ Transaction flow completed successfully');
      console.log('========================================\n');
    } catch (e: any) {
      const displayMsg = getErrorMessage(e);
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[${action}]`, displayMsg, e);
      }
      
      // Detect wallet cancellation/rejection
      const errorMsg = displayMsg.toLowerCase();
      const isCancelled = errorMsg.includes('cancel') || errorMsg.includes('reject') || errorMsg.includes('denied') || errorMsg.includes('user rejected');
      
      if (isCancelled) {
        setStatusMessage('Transaction cancelled by user.');
        if (!isDevAppEnv) {
          setTimeout(() => setStatusMessage(''), 2500);
        }
      } else {
        setStatusMessage(displayMsg);
        const isLiquidityOrLimit =
          errorMsg.includes('withdraw at most') ||
          errorMsg.includes('available pool liquidity') ||
          errorMsg.includes('free for withdrawal') ||
          errorMsg.includes('exceeds available') ||
          errorMsg.includes('insufficient liquidity');
        if (isLiquidityOrLimit) setAmountError(displayMsg);
      }
    } finally {
      setLoading(false);
      console.log(`🏁 ${action.toUpperCase()} flow ended (loading set to false)`);
    }
  };

  const handleActionUsdc = async (action: 'deposit' | 'borrow' | 'repay' | 'withdraw') => {
    if (!connected || !publicKey || !executeTransaction || !requestRecords) {
      setStatusMessage('Please connect your wallet.');
      return;
    }
    try {
      setLoading(true);
      setStatusMessage(`Executing USDC ${action}...`);
      setAmountErrorUsdc(null);
      if (amountUsdc <= 0) {
        throw new Error('Amount must be greater than zero.');
      }
      const amountMicro = Math.round(amountUsdc * 1_000_000);
      const USDC_SCALE = 1_000_000;
      const netSuppliedMicro = (effectiveUserSuppliedUsdc ?? Number(userSuppliedUsdc)) || 0;
      const netBorrowedMicro = (effectiveUserBorrowedUsdc ?? Number(userBorrowedUsdc)) || 0;
      const poolSuppliedMicro = Number(totalSuppliedUsdc) || 0;
      const poolBorrowedMicro = Number(totalBorrowedUsdc) || 0;
      const netSuppliedHuman = netSuppliedMicro / USDC_SCALE;
      const maxRepayHuman = netBorrowedMicro / USDC_SCALE;
      const availableLiquidityHuman = Math.max(0, (poolSuppliedMicro - poolBorrowedMicro) / USDC_SCALE);
      const poolStateLoadedUsdc = poolSuppliedMicro > 0 || poolBorrowedMicro > 0;
      const maxWithdrawHuman = poolStateLoadedUsdc
        ? Math.min(netSuppliedHuman, availableLiquidityHuman)
        : netSuppliedHuman;
      if (action === 'withdraw' && amountUsdc > maxWithdrawHuman) {
        const msg = poolStateLoadedUsdc && availableLiquidityHuman < netSuppliedHuman
          ? `You can withdraw at most ${maxWithdrawHuman.toFixed(2)} USDCx (available pool liquidity). Your position is ${netSuppliedHuman.toFixed(2)} USDCx but only ${availableLiquidityHuman.toFixed(2)} USDCx is free for withdrawal.`
          : `You can withdraw at most ${netSuppliedHuman.toFixed(2)} USDCx from your current position.`;
        setAmountErrorUsdc(msg);
        setStatusMessage(msg);
        setLoading(false);
        return;
      }
      if (action === 'repay' && amountUsdc > maxRepayHuman) {
        const msg = `Repay at most ${maxRepayHuman.toFixed(2)} USDCx.`;
        setAmountErrorUsdc(msg);
        setStatusMessage(msg);
        setLoading(false);
        return;
      }
      if (action === 'borrow' && amountUsdc > availableLiquidityHuman) {
        const msg = `Borrow exceeds available liquidity (${availableLiquidityHuman.toFixed(2)} USDCx).`;
        setAmountErrorUsdc(msg);
        setStatusMessage(msg);
        setLoading(false);
        return;
      }
      if (action === 'deposit' || action === 'repay') {
        let balance = privateUsdcBalance;
        if (balance === null && requestRecords) {
          balance = await getPrivateUsdcBalance(requestRecords, decrypt);
          setPrivateUsdcBalance(balance);
        }
        if (amountUsdc > (balance ?? 0)) {
          const msg = `Insufficient private USDC. Your balance: ${(Math.floor((balance ?? 0) * 100) / 100).toFixed(2)} USDC.`;
          setAmountErrorUsdc(msg);
          setStatusMessage(msg);
          setLoading(false);
          return;
        }
      }
      setActionModalSubmitted(true);
      let tx: string;
      switch (action) {
        case 'deposit': {
          let tokenRecord = await getSuitableUsdcTokenRecord(requestRecords, amountMicro, publicKey);
          if (!tokenRecord) {
            console.warn('[USDC Deposit] No suitable USDCx record. See [getSuitableUsdcTokenRecord] logs above for details.');
            setAmountErrorUsdc('No USDC record found with sufficient balance. Get USDCx from the faucet or select a record. Check browser console (F12) for details.');
            setStatusMessage('No USDCx record with sufficient balance.');
            setLoading(false);
            return;
          }
          if (!tokenRecord.plaintext && decrypt) {
            const cipher = tokenRecord.recordCiphertext ?? tokenRecord.record_ciphertext ?? tokenRecord.ciphertext;
            if (typeof cipher === 'string') {
              try {
                const plain = await decrypt(cipher);
                if (plain) tokenRecord = { ...tokenRecord, plaintext: plain };
              } catch (e) {
                console.warn('[USDC Deposit] Decrypt failed, using ciphertext:', e);
              }
            }
          }
          tx = await lendingDepositUsdc(executeTransaction, amountUsdc, tokenRecord);
          break;
        }
        case 'repay': {
          let tokenRecord = await getSuitableUsdcTokenRecord(requestRecords, amountMicro, publicKey);
          if (!tokenRecord) {
            console.warn('[USDC Repay] No suitable USDCx record. See [getSuitableUsdcTokenRecord] logs above for details.');
            setAmountErrorUsdc('No USDC record found with sufficient balance for repay. Check browser console (F12) for details.');
            setStatusMessage('No USDCx record with sufficient balance.');
            setLoading(false);
            return;
          }
          if (!tokenRecord.plaintext && decrypt) {
            const cipher = tokenRecord.recordCiphertext ?? tokenRecord.record_ciphertext ?? tokenRecord.ciphertext;
            if (typeof cipher === 'string') {
              try {
                const plain = await decrypt(cipher);
                if (plain) tokenRecord = { ...tokenRecord, plaintext: plain };
              } catch (e) {
                console.warn('[USDC Repay] Decrypt failed, using ciphertext:', e);
              }
            }
          }
          tx = await lendingRepayUsdc(executeTransaction, amountUsdc, tokenRecord);
          break;
        }
        case 'withdraw': {
          tx = await lendingWithdrawUsdc(executeTransaction, amountUsdc);
          break;
        }
        case 'borrow': {
          tx = await lendingBorrowUsdc(executeTransaction, amountUsdc);
          break;
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      if (tx === '__CANCELLED__') {
        setStatusMessage('Transaction cancelled by user.');
        if (!isDevAppEnv) setTimeout(() => setStatusMessage(''), 2500);
        setLoading(false);
        return;
      }
      setTxId(null);
      setTxFinalized(false);
      setStatusMessage('Transaction submitted. Waiting for finalization…');
      let finalized = false;
      let txFailed = false;
      let finalTxId = tx;
      for (let attempt = 1; attempt <= 45; attempt++) {
        await new Promise((r) => setTimeout(r, 2000));
        if (transactionStatus) {
          try {
            const statusResult = await transactionStatus(tx);
            const statusText = typeof statusResult === 'string' ? statusResult : (statusResult as any)?.status ?? '';
            const statusLower = (statusText || '').toLowerCase();
            if (statusLower === 'finalized' || statusLower === 'accepted') {
              finalized = true;
              finalTxId = (typeof statusResult === 'object' && (statusResult as any).transactionId) || tx;
              setTxId(isExplorerHash(finalTxId) ? finalTxId : null);
              break;
            }
            if (statusLower === 'rejected' || statusLower === 'failed' || statusLower === 'dropped') {
              txFailed = true;
              setStatusMessage(`Transaction ${statusLower}. Vault transfer was not requested.`);
              setLoading(false);
              return;
            }
          } catch {
            // continue polling
          }
        }
      }
      if (txFailed) {
        setLoading(false);
        return;
      }
      if (!finalized) {
        setStatusMessage('Transaction not finalized in time. Please check the explorer. Backend will process vault transfer once it is finalized.');
        setLoading(false);
        return;
      }
      setTxFinalized(true);
      if (action === 'deposit' || action === 'repay') {
        if (publicKey) {
          saveTransactionToSupabase(
            publicKey,
            finalTxId,
            action,
            'usdcx',
            amountUsdc,
            USDC_LENDING_POOL_PROGRAM_ID
          )
            .then(() => fetchTransactionHistory())
            .catch(() => {});
        }
      }
      // Backend watcher picks up the row and performs vault transfer; no frontend call.
      if (action === 'withdraw' || action === 'borrow') {
        if (publicKey) {
          await saveTransactionToSupabase(publicKey, finalTxId, action, 'usdcx', amountUsdc, USDC_LENDING_POOL_PROGRAM_ID, null).catch(() => {});
          fetchTransactionHistory();
        }
      }
      setAmountUsdc(0);
      try {
        await refreshUsdcPoolState(true);
        setStatusMessage('Transaction finalized! Pool refreshed.');
        if (!isDevAppEnv) setTimeout(() => setStatusMessage(''), 2500);
      } catch {
        setStatusMessage('Transaction finalized. Click Refresh to update pool.');
      }
    } catch (e: any) {
      const displayMsg = getErrorMessage(e);
      setStatusMessage(displayMsg);
      const errorLower = displayMsg.toLowerCase();
      const isLiquidityOrLimit =
        errorLower.includes('withdraw at most') ||
        errorLower.includes('available pool liquidity') ||
        errorLower.includes('free for withdrawal') ||
        errorLower.includes('exceeds available') ||
        errorLower.includes('insufficient liquidity');
      if (isLiquidityOrLimit) setAmountErrorUsdc(displayMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTestCredits = async () => {
    if (!connected || !publicKey || !requestTransaction) {
      setStatusMessage('Please connect your wallet first.');
      return;
    }

    if (testCreditsAmount <= 0) {
      setStatusMessage('Amount must be greater than zero.');
      return;
    }

    try {
      setLoading(true);
      setStatusMessage(`Creating ${testCreditsAmount} test credits...`);

      const tx = await createTestCredits(requestTransaction, publicKey, testCreditsAmount);
      
      setTxId(null);
      setTxFinalized(false);
      setStatusMessage('Test credits creation submitted. Waiting for finalization…');

      // Poll for transaction finalization using wallet's transactionStatus
      let finalized = false;
      const maxAttempts = 30; // 30 attempts
      const delayMs = 2000; // 2 seconds between attempts

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        
        if (transactionStatus) {
          try {
            const status = await transactionStatus(tx);
            console.log(`🧪 Create Test Credits: Poll attempt ${attempt}/${maxAttempts}, status:`, status);
            
            if (status && (status.status === 'Finalized' || status.finalized)) {
              finalized = true;
              const resolvedId = (typeof status === 'object' && (status as any).transactionId) || tx;
              setTxId(isExplorerHash(resolvedId) ? resolvedId : null);
              setTxFinalized(true);
              setStatusMessage(`✅ Test credits created successfully! You should now have a Credits record with ${testCreditsAmount} credits (${testCreditsAmount * 1_000_000} microcredits) in your wallet.`);
              
              // Fetch records in background to update UI
              fetchRecordsInBackground();
              break;
            }
          } catch (statusError: any) {
            console.warn(`🧪 Create Test Credits: Status check failed (attempt ${attempt}):`, statusError?.message);
          }
        }
      }

      if (!finalized) {
        setStatusMessage(
          'Test credits creation submitted but not finalized within the expected time. The Credits record will appear in your wallet once the transaction is finalized.'
        );
      }
    } catch (e: any) {
      console.error('❌ ERROR in CREATE TEST CREDITS:', e);

      const errorMsg = String(e?.message || e || '').toLowerCase();
      const isCancelled =
        errorMsg.includes('cancel') ||
        errorMsg.includes('reject') ||
        errorMsg.includes('denied') ||
        errorMsg.includes('user rejected');

      if (isCancelled) {
        setStatusMessage('Transaction cancelled by user.');
        if (!isDevAppEnv) {
          setTimeout(() => setStatusMessage(''), 2500);
        }
      } else {
        setStatusMessage(e?.message || 'Failed to create test credits. Check console for details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDepositTestReal = async () => {
    if (!connected || !publicKey || !requestTransaction || !requestRecords) {
      setStatusMessage('Please connect your wallet first and ensure record access is granted.');
      return;
    }

    if (amount <= 0) {
      setStatusMessage('Amount must be greater than zero.');
      return;
    }

    try {
      setLoading(true);
      setStatusMessage(`Testing deposit with ${amount} credits...`);

      const tx = await depositTestReal(requestTransaction, publicKey, amount, requestRecords);
      
      setTxId(null);
      setTxFinalized(false);
      setStatusMessage('Deposit test submitted. Waiting for finalization…');

      // Poll for transaction finalization using wallet's transactionStatus
      let finalized = false;
      const maxAttempts = 30; // 30 attempts
      const delayMs = 2000; // 2 seconds between attempts

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        
        if (transactionStatus) {
          try {
            const status = await transactionStatus(tx);
            console.log(`🧪 Deposit Test Real: Poll attempt ${attempt}/${maxAttempts}, status:`, status);
            
            if (status && (status.status === 'Finalized' || status.finalized)) {
              finalized = true;
              const resolvedId = (typeof status === 'object' && (status as any).transactionId) || tx;
              setTxId(isExplorerHash(resolvedId) ? resolvedId : null);
              setTxFinalized(true);
              setStatusMessage(`✅ Deposit test completed successfully! The test validates that real Aleo credits records work correctly. If this succeeded, your Credits record format is correct.`);
              
              // Fetch records in background to update UI
              fetchRecordsInBackground();
              break;
            }
          } catch (statusError: any) {
            console.warn(`🧪 Deposit Test Real: Status check failed (attempt ${attempt}):`, statusError?.message);
          }
        }
      }

      if (!finalized) {
        setStatusMessage(
          'Deposit test submitted but not finalized within the expected time. The transaction may still be processing.'
        );
      }
    } catch (e: any) {
      console.error('❌ ERROR in DEPOSIT TEST REAL:', e);

      const errorMsg = String(e?.message || e || '').toLowerCase();
      const isCancelled =
        errorMsg.includes('cancel') ||
        errorMsg.includes('reject') ||
        errorMsg.includes('denied') ||
        errorMsg.includes('user rejected');

      if (isCancelled) {
        setStatusMessage('Transaction cancelled by user.');
        if (!isDevAppEnv) {
          setTimeout(() => setStatusMessage(''), 2500);
        }
      } else {
        setStatusMessage(e?.message || 'Failed to run deposit test. Check console for details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccrueInterest = async () => {
    if (!connected || !executeTransaction) {
      setStatusMessage('Please connect your wallet first.');
      return;
    }

    try {
      setLoading(true);
      setStatusMessage('Accruing interest...');

      const tx = await lendingAccrueInterest(executeTransaction);

      setTxId(null);
      setTxFinalized(false);
      setStatusMessage('Interest accrual submitted. Waiting for finalization…');

      // Poll for transaction finalization using wallet's transactionStatus
      let finalized = false;
      const maxAttempts = 30; // 30 attempts
      const delayMs = 2000; // 2 seconds between attempts

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        
        if (transactionStatus) {
          try {
            const statusResult = await transactionStatus(tx);
            console.log(`📊 Accrue interest status (attempt ${attempt}):`, statusResult);

            const statusText =
              typeof statusResult === 'string'
                ? statusResult
                : (statusResult as any)?.status ?? '';
            const statusLower = (statusText || '').toLowerCase();

            if (statusLower === 'finalized' || statusLower === 'accepted') {
              finalized = true;
              const resolvedId = (typeof statusResult === 'object' && (statusResult as any).transactionId) || tx;
              setTxId(isExplorerHash(resolvedId) ? resolvedId : null);
              setTxFinalized(true);
              // Fetch records in background after interest accrual finalizes
              if (requestRecords && publicKey) {
                console.log('📋 Interest accrual finalized - fetching records in background...');
                fetchRecordsInBackground(LENDING_POOL_PROGRAM_ID);
              }
              break;
            }
            setStatusMessage(
              `Interest accrual ${statusText || 'pending'}... (attempt ${attempt}/${maxAttempts})`,
            );
          } catch (e) {
            // If transactionStatus fails, continue polling
            console.warn('Failed to check transaction status:', e);
          }
        } else {
          // Fallback: just wait and assume it will finalize
          if (attempt === maxAttempts) {
            finalized = true; // Assume finalized after max wait time
          }
        }
      }

      if (finalized) {
        setTxFinalized(true);
        // Refresh pool + user data once interest accrual is finalized
        try {
          console.log('📋 Interest accrual finalized - refreshing pool and user position...');
          await refreshPoolState(true);
          setStatusMessage('Interest accrued and finalized! Pool and position have been refreshed.');
          if (!isDevAppEnv) {
            setTimeout(() => setStatusMessage(''), 2500);
          }
        } catch (refreshError) {
          console.warn('⚠️ Failed to refresh after interest accrual:', refreshError);
          setStatusMessage(
            'Interest accrued and finalized, but automatic refresh failed. Please click Refresh.',
          );
        }
      } else {
        setStatusMessage(
          'Interest accrual submitted but not finalized within the expected time. It may still be processing. Pool state will update once finalized.'
        );
      }
    } catch (e: any) {
      console.error('Accrue interest error:', e);
      
      // Detect wallet cancellation/rejection
      const errorMsg = String(e?.message || e || '').toLowerCase();
      const isCancelled = errorMsg.includes('cancel') || errorMsg.includes('reject') || errorMsg.includes('denied') || errorMsg.includes('user rejected');
      
      if (isCancelled) {
        setStatusMessage('Transaction cancelled by user.');
        if (!isDevAppEnv) {
          setTimeout(() => setStatusMessage(''), 2500);
        }
      } else {
        setStatusMessage(e?.message || 'Failed to accrue interest. Check console for details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccrueInterestUsdc = async () => {
    if (!connected || !executeTransaction) {
      setStatusMessage('Please connect your wallet first.');
      return;
    }

    try {
      setLoading(true);
      setStatusMessage('Accruing USDC interest...');

      const tx = await lendingAccrueInterestUsdc(executeTransaction);

      setTxId(null);
      setTxFinalized(false);
      setStatusMessage('USDC interest accrual submitted. Waiting for finalization…');

      let finalized = false;
      const maxAttempts = 30;
      const delayMs = 2000;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (transactionStatus) {
          try {
            const statusResult = await transactionStatus(tx);
            const statusText =
              typeof statusResult === 'string'
                ? statusResult
                : (statusResult as any)?.status ?? '';
            const statusLower = (statusText || '').toLowerCase();
            if (statusLower === 'finalized' || statusLower === 'accepted') {
              finalized = true;
              const resolvedId = (typeof statusResult === 'object' && (statusResult as any).transactionId) || tx;
              setTxId(isExplorerHash(resolvedId) ? resolvedId : null);
              setTxFinalized(true);
              break;
            }
          } catch {
            // continue polling
          }
        }
      }

      if (!finalized) {
        setStatusMessage('USDC interest accrual submitted but not finalized in time. Please check the explorer.');
      } else {
        setStatusMessage('USDC interest accrued successfully.');
      }
    } catch (e: any) {
      setStatusMessage(e?.message || 'USDC accrue interest failed.');
    } finally {
      setLoading(false);
    }
  };

  // Catch wallet cancellation errors globally and show a toast instead of crashing the app
  useEffect(() => {
    const isWalletCancelMessage = (msg: string | undefined | null) => {
      const lower = String(msg || '').toLowerCase();
      return (
        lower.includes('operation was cancelled by the user') ||
        lower.includes('operation was canceled by the user') ||
        lower.includes('operation cancelled by user') ||
        lower.includes('transaction cancelled by user') ||
        lower.includes('transaction canceled by user')
      );
    };

    const showCancelToast = () => {
      setStatusMessage('Transaction cancelled by user.');
      if (!isDevAppEnv) {
        setTimeout(() => setStatusMessage(''), 2500);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event.reason;
      const msg = reason?.message || reason;

      if (isWalletCancelMessage(msg)) {
        // Prevent Next.js runtime error overlay
        event.preventDefault();
        showCancelToast();
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      const msg = event.message || event.error?.message;
      if (isWalletCancelMessage(msg)) {
        // Prevent default error handling (overlay) and just show toast
        event.preventDefault();
        showCancelToast();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, [isDevAppEnv]);

  // Display values for merged Aave-style view (human units)
  const supplyBalanceAleo = ((effectiveUserSupplied ?? Number(userSupplied)) || 0) / 1_000_000;
  const supplyBalanceUsdc = ((effectiveUserSuppliedUsdc ?? Number(userSuppliedUsdc)) || 0) / 1_000_000;
  const borrowDebtAleo = ((effectiveUserBorrowed ?? Number(userBorrowed)) || 0) / 1_000_000;
  const borrowDebtUsdc = ((effectiveUserBorrowedUsdc ?? Number(userBorrowedUsdc)) || 0) / 1_000_000;
  const totalSupplyBalance = supplyBalanceAleo + supplyBalanceUsdc; // mixed units for count only
  const totalBorrowDebt = borrowDebtAleo + borrowDebtUsdc;

  // Simple loading flags for balances
  const walletBalancesLoading = connected && !userPositionInitialized;
  const availableAleo = Math.max(
    0,
    ((Number(totalSupplied) || 0) - (Number(totalBorrowed) || 0)) / 1_000_000,
  );
  const availableUsdc = Math.max(
    0,
    ((Number(totalSuppliedUsdc) || 0) - (Number(totalBorrowedUsdc) || 0)) / 1_000_000,
  );

  const modalAmount = (() => {
    const n = Number(modalAmountInput);
    return Number.isNaN(n) ? 0 : n;
  })();

  const actionModalTitle =
    actionModalMode === 'withdraw'
      ? `Withdraw ${actionModalAsset === 'aleo' ? 'ALEO' : 'USDCx'}`
      : actionModalMode === 'deposit'
        ? `Deposit ${actionModalAsset === 'aleo' ? 'ALEO' : 'USDCx'}`
        : actionModalMode === 'borrow'
          ? `Borrow ${actionModalAsset === 'aleo' ? 'ALEO' : 'USDCx'}`
          : `Repay ${actionModalAsset === 'aleo' ? 'ALEO' : 'USDCx'}`;

  const supplyBalanceModal = actionModalAsset === 'aleo' ? supplyBalanceAleo : supplyBalanceUsdc;
  const debtBalanceModal = actionModalAsset === 'aleo' ? borrowDebtAleo : borrowDebtUsdc;
  const privateBalanceModal = actionModalAsset === 'aleo' ? (privateAleoBalance ?? 0) : (privateUsdcBalance ?? 0);
  // Max amount constraints per action type (used to disable action button)
  const modalMaxAmount =
    actionModalMode === 'deposit'
      ? privateBalanceModal
      : actionModalMode === 'withdraw'
        ? supplyBalanceModal
        : actionModalMode === 'borrow'
          ? (actionModalAsset === 'aleo' ? availableAleo : availableUsdc)
          : debtBalanceModal;

  const remainingSupply = actionModalMode === 'withdraw'
    ? Math.max(0, supplyBalanceModal - modalAmount)
    : actionModalMode === 'deposit'
      ? supplyBalanceModal + modalAmount
      : actionModalMode === 'borrow'
        ? debtBalanceModal + modalAmount
        : Math.max(0, debtBalanceModal - modalAmount);

  if (view === 'markets') {
    return <MarketsView />;
  }

  if (view === 'docs') {
    // Reuse the docs page content inside the dashboard layout so wallet state is shared
    return <DocsPage />;
  }

  return (
    <div className="flex justify-center pt-16 sm:pt-20">
      {/* Aave-style action modal (withdraw/deposit/borrow/repay) */}
      {actionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            const canClose = !actionModalSubmitted || (!loading && txFinalized);
            if (e.target === e.currentTarget && canClose) closeActionModal();
          }}
        >
          <div className="bg-base-200 rounded-xl shadow-xl w-full max-w-md border border-base-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-base-300 flex items-center justify-between">
              <h2 className="text-xl font-bold">{actionModalTitle}</h2>
              {(!actionModalSubmitted || (!loading && txFinalized)) ? (
                <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={closeActionModal} aria-label="Close">×</button>
              ) : null}
            </div>
            <div className="p-4 space-y-4">
              {!actionModalSubmitted ? (
                <>
                  <div>
                    <label className="label">
                      <span className="label-text">Amount</span>
                    </label>
                    <div className="flex items-center gap-2 rounded-lg bg-base-300/50 p-2">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={modalAmountInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setModalAmountInput(val);
                          const n = Number(val);
                          if (!Number.isNaN(n)) {
                            if (actionModalAsset === 'usdc') {
                              setAmountUsdc(n);
                            } else {
                              setAmount(n);
                            }
                          }
                        }}
                        placeholder="0.00"
                        className="input input-bordered flex-1 bg-transparent border-0 focus:outline-none"
                      />
                      <span className="font-medium">{actionModalAsset === 'aleo' ? 'ALEO' : 'USDCx'}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-sm text-base-content/70">
                      <span>
                      {actionModalMode === 'withdraw'
                        ? 'Supply balance '
                        : actionModalMode === 'deposit'
                          ? 'Wallet balance '
                          : actionModalMode === 'borrow'
                            ? 'Available to borrow '
                            : 'Debt '}
                      {actionModalMode === 'withdraw'
                        ? supplyBalanceModal.toFixed(7)
                        : actionModalMode === 'deposit'
                          ? privateBalanceModal.toFixed(7)
                          : actionModalMode === 'borrow'
                            ? (actionModalAsset === 'aleo' ? availableAleo : availableUsdc).toFixed(7)
                            : debtBalanceModal.toFixed(7)}
                        {' '}
                        <button
                          type="button"
                          className="link link-primary text-xs"
                          onClick={() => {
                            const maxVal =
                              actionModalMode === 'withdraw'
                                ? supplyBalanceModal
                                : actionModalMode === 'deposit'
                                  ? privateBalanceModal
                                  : actionModalMode === 'borrow'
                                    ? (actionModalAsset === 'aleo' ? availableAleo : availableUsdc)
                                    : debtBalanceModal;
                            setModalAmountInput(String(maxVal));
                            if (actionModalAsset === 'usdc') {
                              setAmountUsdc(maxVal);
                            } else {
                              setAmount(maxVal);
                            }
                          }}
                        >
                          MAX
                        </button>
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-base-300/30 p-3 space-y-2">
                    <div className="font-medium text-sm">Transaction overview</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-base-content/70">
                        {actionModalMode === 'withdraw' ? 'Remaining supply' : actionModalMode === 'deposit' ? 'Supply after' : actionModalMode === 'borrow' ? 'Debt after' : 'Remaining debt'}
                      </span>
                      <span>{remainingSupply.toFixed(7)} {actionModalAsset === 'aleo' ? 'ALEO' : 'USDCx'}</span>
                    </div>
                  </div>
                  {(actionModalAsset === 'aleo' ? amountError : amountErrorUsdc) ? (
                    <div className="rounded-lg bg-error/15 border border-error/30 px-4 py-3 text-error text-sm">
                      {actionModalAsset === 'aleo' ? amountError : amountErrorUsdc}
                    </div>
                  ) : statusMessage ? (
                    <div className="rounded-lg bg-error/15 border border-error/30 px-4 py-3 text-error text-sm">
                      {statusMessage}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    disabled={
                      loading ||
                      !modalAmount ||
                      modalAmount <= 0 ||
                      modalAmount > modalMaxAmount
                    }
                    onClick={async () => {
                      if (actionModalAsset === 'usdc') {
                        await handleActionUsdc(actionModalMode);
                      } else {
                        await handleAction(actionModalMode);
                      }
                    }}
                  >
                    {loading ? <span className="loading loading-spinner loading-sm" /> : null}
                    {!modalAmount || modalAmount <= 0
                      ? 'Enter an amount'
                      : modalAmount > modalMaxAmount
                        ? 'Amount too high'
                        : actionModalTitle}
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  {loading || (txId && !txFinalized) ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <span className="loading loading-spinner loading-lg" />
                      {txFinalized && txId && (actionModalMode === 'withdraw' || actionModalMode === 'borrow') ? (
                        <>
                          <p className="text-sm font-medium text-base-content">Program transaction confirmed.</p>
                          <p className="text-sm text-base-content/70">Initiating vault transfer…</p>
                        </>
                      ) : (
                        <p className="text-sm text-base-content/70">Processing…</p>
                      )}
                      {statusMessage ? (
                        <div className={`rounded-lg px-4 py-3 mt-2 max-w-sm w-full text-center text-sm ${statusMessage.includes('at most') || statusMessage.includes('liquidity') || statusMessage.includes('Failed') || statusMessage.includes('Insufficient') || statusMessage.includes('free for withdrawal') ? 'bg-error/15 text-error' : 'text-base-content/70'}`}>
                          {statusMessage}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      {statusMessage && !txFinalized ? (
                        <div className="rounded-lg bg-error/15 border border-error/30 px-4 py-3 text-error text-sm text-center w-full">
                          {statusMessage}
                        </div>
                      ) : null}
                      {txFinalized && txId ? (
                        <a
                          href={getProvableExplorerTxUrl(txId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-primary text-base font-medium block text-center py-2"
                        >
                          View in explorer
                        </a>
                      ) : null}
                      {txFinalized ? (
                        <p className="text-sm text-base-content/70 text-center">
                          {actionModalMode === 'withdraw' || actionModalMode === 'borrow'
                            ? 'Transaction finalized! Vault transfer will be done in 1–5 min — check status in Transaction History.'
                            : 'Transaction finalized.'}
                        </p>
                      ) : null}
                      {txFinalized && (actionModalMode === 'withdraw' || actionModalMode === 'borrow') && (vaultWithdrawTxId || vaultBorrowTxId) ? (
                        <a
                          href={getProvableExplorerTxUrl(vaultWithdrawTxId || vaultBorrowTxId!)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-primary text-base font-medium block text-center py-2"
                        >
                          View vault transfer in explorer
                        </a>
                      ) : null}
                      <button type="button" className="btn btn-primary w-full mt-2" onClick={closeActionModal}>
                        Close
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 w-full max-w-6xl px-4">
        {/* Brief loading when wallet state may be restoring after nav (e.g. from Markets) */}
        {!connected && (connecting || !allowShowConnectCTA) && (
          <div className="rounded-xl bg-base-200 border border-base-300 flex flex-col items-center justify-center py-16 px-6">
            <span className="loading loading-spinner loading-lg text-primary" />
            <p className="text-sm text-base-content/70 mt-3">Loading wallet…</p>
          </div>
        )}
        {/* Aave-style: connect wallet CTA when not connected */}
        {!connected && !connecting && allowShowConnectCTA && (
          <div className="rounded-xl bg-base-200 border border-base-300 flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-24 h-24 rounded-full bg-base-300 flex items-center justify-center mb-4 text-4xl opacity-80" aria-hidden>
              👻
            </div>
            <h2 className="text-xl font-bold mb-2">Please, connect your wallet</h2>
            <p className="text-base-content/70 text-sm max-w-md mb-6">
              Connect your wallet to see your supplies, borrowings, and open positions.
            </p>
            <div className="wallet-button-wrapper">
              <WalletMultiButton className="!bg-gradient-to-r !from-primary !to-secondary !border-0 !text-primary-content !font-semibold !px-6 !py-3 !rounded-lg !min-h-0 !h-auto" />
            </div>
            <p className="text-xs text-base-content/60 mt-4">
              Market data is public — view <Link href="/markets" className="link link-primary">Markets</Link> without connecting.
            </p>
          </div>
        )}

        {/* Aave-style merged view when connected */}
        {connected && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { refreshPoolState(true); refreshUsdcPoolState(true); }}
                disabled={loading || isRefreshingState || isRefreshingUsdcState}
                className={`btn btn-sm btn-primary gap-2 text-primary-content border-0 transition-all duration-200 ${
                  isRefreshingState || isRefreshingUsdcState ? 'cursor-wait opacity-90' : 'hover:opacity-90 active:scale-[0.98]'
                }`}
                title={isRefreshingState || isRefreshingUsdcState ? 'Updating pool data…' : 'Reload pool and position data'}
                aria-busy={isRefreshingState || isRefreshingUsdcState}
              >
                {(isRefreshingState || isRefreshingUsdcState) ? (
                  <>
                    <span className="loading loading-spinner loading-sm text-primary-content" />
                    <span className="text-primary-content">Refreshing…</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-primary-content" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span className="text-primary-content">Refresh</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Assets to supply — same design as Your supplies */}
              <div className="rounded-xl bg-base-200 p-5 space-y-4 border border-base-300">
                <h2 className="text-lg font-semibold text-base-content">Assets to supply</h2>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th className="text-base-content/70 font-medium">Asset</th>
                        <th className="text-base-content/70 font-medium"><PrivateDataColumnHeader label="Wallet balance" /></th>
                        <th className="text-base-content/70 font-medium">
                          <span className="inline-flex items-center">
                            APY
                            <InfoTooltip
                              tip="Supply APY is the yearly interest you earn for supplying to this pool. It is based on utilization (total borrowed divided by total supplied) and a reserve factor that keeps a small share of interest in the protocol."
                            />
                          </span>
                        </th>
                        <th className="text-base-content/70 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><span className="font-medium">ALEO</span></td>
                        <td className="text-base-content/90">
                          {walletBalancesLoading ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : privateAleoBalance != null ? (
                            privateAleoBalance.toFixed(4)
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="text-base-content">
                          {walletBalancesLoading ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : (
                            (supplyAPY * 100).toFixed(2) + '%'
                          )}
                        </td>
                        <td>
                          <PrivateActionButton
                            onClick={() => openActionModal('deposit', 'aleo')}
                            disabled={
                              loading ||
                              !connected ||
                              walletBalancesLoading ||
                              (privateAleoBalance ?? 0) <= 0
                            }
                          >
                            Supply
                          </PrivateActionButton>
                        </td>
                      </tr>
                      <tr>
                        <td><span className="font-medium">USDCx</span></td>
                        <td className="text-base-content/90">
                          {walletBalancesLoading ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : privateUsdcBalance != null ? (
                            privateUsdcBalance.toFixed(4)
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="text-base-content">
                          {walletBalancesLoading ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : (
                            (supplyAPYUsdc * 100).toFixed(2) + '%'
                          )}
                        </td>
                        <td>
                          <PrivateActionButton
                            onClick={() => openActionModal('deposit', 'usdc')}
                            disabled={
                              loading ||
                              !connected ||
                              walletBalancesLoading ||
                              (privateUsdcBalance ?? 0) <= 0
                            }
                          >
                            Supply
                          </PrivateActionButton>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Assets to borrow — same design as Your borrows */}
              <div className="rounded-xl bg-base-200 p-5 space-y-4 border border-base-300">
                <h2 className="text-lg font-semibold text-base-content">Assets to borrow</h2>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th className="text-base-content/70 font-medium">Asset</th>
                        <th className="text-base-content/70 font-medium"><PrivateDataColumnHeader label="Available" /></th>
                        <th className="text-base-content/70 font-medium">
                          <span className="inline-flex items-center">
                            APY
                            <InfoTooltip
                              tip="Borrow APY is the yearly interest you pay when borrowing from this pool. The rate increases as utilization (total borrowed divided by total supplied) goes up."
                            />
                          </span>
                        </th>
                        <th className="text-base-content/70 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><span className="font-medium">ALEO</span></td>
                        <td className="text-base-content/90">
                          {isRefreshingState ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : (
                            availableAleo.toFixed(4)
                          )}
                        </td>
                        <td className="text-base-content">
                          {isRefreshingState ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : (
                            (borrowAPY * 100).toFixed(2) + '%'
                          )}
                        </td>
                        <td>
                          <PrivateActionButton
                            onClick={() => openActionModal('borrow', 'aleo')}
                            disabled={loading || !connected || isRefreshingState || availableAleo <= 0}
                          >
                            Borrow
                          </PrivateActionButton>
                        </td>
                      </tr>
                      <tr>
                        <td><span className="font-medium">USDCx</span></td>
                        <td className="text-base-content/90">
                          {isRefreshingUsdcState ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : (
                            availableUsdc.toFixed(4)
                          )}
                        </td>
                        <td className="text-base-content">
                          {isRefreshingUsdcState ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : (
                            (borrowAPYUsdc * 100).toFixed(2) + '%'
                          )}
                        </td>
                        <td>
                          <PrivateActionButton
                            onClick={() => openActionModal('borrow', 'usdc')}
                            disabled={loading || !connected || isRefreshingUsdcState || availableUsdc <= 0}
                          >
                            Borrow
                          </PrivateActionButton>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Your supplies */}
              <div className="rounded-xl bg-base-200 p-5 space-y-4 border border-base-300">
                <h2 className="text-lg font-semibold text-base-content">Your supplies</h2>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th className="text-base-content/70 font-medium">Asset</th>
                        <th className="text-base-content/70 font-medium"><PrivateDataColumnHeader label="Balance" /></th>
                        <th className="text-base-content/70 font-medium">APY</th>
                        <th className="text-base-content/70 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><span className="font-medium">ALEO</span></td>
                        <td className="text-base-content/90">
                          {walletBalancesLoading ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : (
                            supplyBalanceAleo.toFixed(4)
                          )}
                        </td>
                        <td className="text-base-content">
                          {walletBalancesLoading ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : (
                            <span className="inline-flex items-center">
                              {(supplyAPY * 100).toFixed(2)}%
                              <InfoTooltip tip={tooltipInterestEarnedAleo} />
                            </span>
                          )}
                        </td>
                        <td>
                          <PrivateActionButton
                            onClick={() => openActionModal('withdraw', 'aleo', supplyBalanceAleo)}
                            disabled={loading || !connected || walletBalancesLoading || supplyBalanceAleo <= 0}
                          >
                            Withdraw
                          </PrivateActionButton>
                        </td>
                      </tr>
                      <tr>
                        <td><span className="font-medium">USDCx</span></td>
                        <td className="text-base-content/90">
                          {walletBalancesLoading ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : (
                            supplyBalanceUsdc.toFixed(4)
                          )}
                        </td>
                        <td className="text-base-content">
                          {walletBalancesLoading ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : (
                            <span className="inline-flex items-center">
                              {(supplyAPYUsdc * 100).toFixed(2)}%
                              <InfoTooltip tip={tooltipInterestEarnedUsdc} />
                            </span>
                          )}
                        </td>
                        <td>
                          <PrivateActionButton
                            onClick={() => openActionModal('withdraw', 'usdc', supplyBalanceUsdc)}
                            disabled={loading || !connected || walletBalancesLoading || supplyBalanceUsdc <= 0}
                          >
                            Withdraw
                          </PrivateActionButton>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Your borrows */}
              <div className="rounded-xl bg-base-200 p-5 space-y-4 border border-base-300">
                <h2 className="text-lg font-semibold text-base-content">Your borrows</h2>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th className="text-base-content/70 font-medium">Asset</th>
                        <th className="text-base-content/70 font-medium"><PrivateDataColumnHeader label="Debt" /></th>
                        <th className="text-base-content/70 font-medium">APY</th>
                        <th className="text-base-content/70 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><span className="font-medium">ALEO</span></td>
                        <td className="text-base-content/90">
                          {walletBalancesLoading ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : (
                            borrowDebtAleo.toFixed(4)
                          )}
                        </td>
                        <td className="text-base-content">
                          {walletBalancesLoading ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : (
                            <span className="inline-flex items-center">
                              {(borrowAPY * 100).toFixed(2)}%
                              <InfoTooltip tip={tooltipInterestOwedAleo} />
                            </span>
                          )}
                        </td>
                        <td>
                          <PrivateActionButton
                            onClick={() => openActionModal('repay', 'aleo', borrowDebtAleo)}
                            disabled={loading || !connected || walletBalancesLoading || borrowDebtAleo <= 0}
                          >
                            Repay
                          </PrivateActionButton>
                        </td>
                      </tr>
                      <tr>
                        <td><span className="font-medium">USDCx</span></td>
                        <td className="text-base-content/90">
                          {walletBalancesLoading ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : (
                            borrowDebtUsdc.toFixed(4)
                          )}
                        </td>
                        <td className="text-base-content">
                          {walletBalancesLoading ? (
                            <span className="loading loading-spinner loading-xs text-base-content/60" />
                          ) : (
                            <span className="inline-flex items-center">
                              {(borrowAPYUsdc * 100).toFixed(2)}%
                              <InfoTooltip tip={tooltipInterestOwedUsdc} />
                            </span>
                          )}
                        </td>
                        <td>
                          <PrivateActionButton
                            onClick={() => openActionModal('repay', 'usdc', borrowDebtUsdc)}
                            disabled={loading || !connected || walletBalancesLoading || borrowDebtUsdc <= 0}
                          >
                            Repay
                          </PrivateActionButton>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction history (Supabase – fetched by wallet address) */}
        <div className="rounded-xl bg-base-200 p-6 border border-base-300 mb-8 pb-2">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-xl font-semibold text-base-content">Transaction history</h2>
            <Button variant="ghost" size="small" onClick={fetchTransactionHistory} disabled={txHistoryLoading || !address}>
              {txHistoryLoading ? 'Loading…' : 'Refresh'}
            </Button>
          </div>
          <p className="text-sm text-base-content/70 mb-4">Fetched by your connected wallet address. All deposit, withdraw, borrow, and repay transactions are stored and listed here.</p>
          {txHistoryError ? (
            <div className="rounded-lg bg-warning/10 border border-warning/30 p-4 text-sm text-warning">
              <p className="font-medium">Could not load transaction history</p>
              <p className="mt-1">{txHistoryError}</p>
              <p className="mt-2 text-base-content/70">
                Ensure you ran <code className="text-xs bg-base-300 px-1 rounded">supabase/schema.sql</code> in Supabase SQL Editor and that{' '}
                <code className="text-xs bg-base-300 px-1 rounded">.env</code> has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUB_KEY (Publishable key).
              </p>
            </div>
          ) : txHistoryLoading && txHistory.length === 0 ? (
            <p className="text-base-content/70">Loading transactions…</p>
          ) : txHistory.length === 0 ? (
            <p className="text-base-content/70">
              No transactions yet. Deposit, withdraw, borrow, or repay to see history here.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th className="text-base-content/70 font-medium">Date</th>
                      <th className="text-base-content/70 font-medium">Type</th>
                      <th className="text-base-content/70 font-medium">Asset</th>
                      <th className="text-base-content/70 font-medium">Amount</th>
                      <th className="text-base-content/70 font-medium">Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const pageSize = 10;
                      const totalPages = Math.max(1, Math.ceil(txHistory.length / pageSize));
                      const currentPage = Math.min(txHistoryPage, totalPages);
                      const startIndex = (currentPage - 1) * pageSize;
                      const pageItems = txHistory.slice(startIndex, startIndex + pageSize);
                      return pageItems.map((row) => (
                        <tr key={row.id}>
                          <td className="text-base-content/90">
                            {new Date(row.created_at).toLocaleString()}
                          </td>
                          <td className="capitalize">{row.type}</td>
                          <td>{row.asset === 'usdcx' ? 'USDCx' : (row.asset === 'aleo' ? 'ALEO' : String(row.asset).toUpperCase())}</td>
                          <td>
                            {Number(row.amount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6,
                            })}
                          </td>
                          <td className="space-y-1">
                            {row.explorer_url ? (
                              <a
                                href={row.explorer_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link link-primary block"
                              >
                                View on Explorer
                              </a>
                            ) : (
                              <span
                                className="font-mono text-sm truncate max-w-[120px] inline-block"
                                title={row.tx_id}
                              >
                                {row.tx_id}
                              </span>
                            )}
                            {row.vault_explorer_url ? (
                              <a
                                href={row.vault_explorer_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link link-secondary block text-sm"
                              >
                                Vault transfer
                              </a>
                            ) : (row.type === 'withdraw' || row.type === 'borrow') ? (
                              <span className="inline-flex items-center gap-2 text-sm text-base-content/70">
                                <span className="loading loading-spinner loading-xs text-primary" aria-hidden />
                                <span>Vault: Pending (1–5 min)</span>
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              {txHistory.length > 10 && (
                <div className="flex items-center justify-between mt-3 text-xs text-base-content/70">
                  {(() => {
                    const pageSize = 10;
                    const totalPages = Math.max(1, Math.ceil(txHistory.length / pageSize));
                    const currentPage = Math.min(txHistoryPage, totalPages);
                    const startIndex = (currentPage - 1) * pageSize;
                    const endIndex = Math.min(startIndex + pageSize, txHistory.length);
                    return (
                      <>
                        <span>
                          Showing {startIndex + 1}–{endIndex} of {txHistory.length} transactions
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="small"
                            disabled={currentPage === 1}
                            onClick={() => setTxHistoryPage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </Button>
                          <span>
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="ghost"
                            size="small"
                            disabled={currentPage === totalPages}
                            onClick={() =>
                              setTxHistoryPage((p) => Math.min(totalPages, p + 1))
                            }
                          >
                            Next
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {isDevAppEnv && (
        <div className="rounded-xl bg-base-200 p-6 space-y-4 border-2 border-info">
          <h2 className="text-xl font-semibold">📊 Frontend Diagnostics & Logs</h2>
          <p className="text-sm opacity-70">
            View, analyze, and export all frontend logs and record diagnostics
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const summary = frontendLogger.getSummary();
                setLogsSummary(summary);
                setShowLogsPanel(true);
              }}
              variant="ghost"
              size="small"
            >
              📋 View Summary
            </Button>
            <Button
              onClick={() => frontendLogger.downloadLogsAsFile('text')}
              variant="ghost"
              size="small"
            >
              💾 Download Logs (TXT)
            </Button>
            <Button
              onClick={() => frontendLogger.downloadRecordDiagnosticsAsFile('json')}
              variant="ghost"
              size="small"
            >
              📦 Download Records (JSON)
            </Button>
            <Button
              onClick={() => frontendLogger.downloadAllAsFile('json')}
              variant="ghost"
              size="small"
            >
              📁 Download All (JSON)
            </Button>
            <Button
              onClick={() => {
                if (requestRecords && publicKey) {
                  debugAllRecords(requestRecords, publicKey).then((results) => {
                    console.log('Diagnostic results:', results);
                    setStatusMessage('✅ Diagnostic complete. Check console for details.');
                  });
                } else {
                  setStatusMessage('❌ Wallet not connected');
                }
              }}
              variant="ghost"
              size="small"
              disabled={!connected}
            >
              🔍 Run Diagnosis
            </Button>
            <Button
              onClick={() => {
                frontendLogger.clearLogs();
                frontendLogger.clearRecordDiagnostics();
                setLogsSummary(null);
                setStatusMessage('✅ Logs cleared');
              }}
              variant="ghost"
              size="small"
            >
              🗑️ Clear Logs
            </Button>
          </div>

          {showLogsPanel && logsSummary && (
            <div className="bg-base-300 p-4 rounded-lg space-y-2 max-h-96 overflow-y-auto">
              <h3 className="font-semibold">📊 Session Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="opacity-70">Total Logs:</span>
                  <p className="font-semibold">{logsSummary.totalLogs}</p>
                </div>
                <div>
                  <span className="opacity-70">Errors:</span>
                  <p className="font-semibold text-error">{logsSummary.errors}</p>
                </div>
                <div>
                  <span className="opacity-70">Warnings:</span>
                  <p className="font-semibold text-warning">{logsSummary.warnings}</p>
                </div>
                <div>
                  <span className="opacity-70">Regular Logs:</span>
                  <p className="font-semibold">{logsSummary.logs}</p>
                </div>
                <div>
                  <span className="opacity-70">Diagnostics:</span>
                  <p className="font-semibold">{logsSummary.totalDiagnostics}</p>
                </div>
                <div>
                  <span className="opacity-70">Duration:</span>
                  <p className="font-semibold">
                    {(logsSummary.sessionDuration / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>
              <p className="text-xs opacity-70 pt-2">
                💡 Download logs to share with developers for debugging
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status + last transaction details */}
      {isDevAppEnv ? (
        <>
          {statusMessage && (
            <div
              className={`alert ${
                statusMessage.includes('error') || statusMessage.includes('Failed')
                  ? 'alert-error'
                  : 'alert-info'
              }`}
            >
              <span>{statusMessage}</span>
            </div>
          )}

          {txId && (
            <div className="rounded-xl bg-base-200 p-4 max-w-xl">
              <h3 className="font-semibold mb-2">
                Last Transaction ID
                {txFinalized && (
                  <span className="ml-2 badge badge-success badge-sm">Finalized</span>
                )}
              </h3>
              <pre className="text-xs whitespace-pre-wrap break-all bg-base-300 p-2 rounded">
                {txId}
              </pre>
              {txFinalized && isExplorerHash(txId) ? (
                <a
                  href={getProvableExplorerTxUrl(txId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary text-sm mt-2 inline-block"
                >
                  View on Provable Explorer →
                </a>
              ) : txFinalized ? (
                <p className="text-xs opacity-70 mt-2">
                  Transaction finalized. This ID comes from Leo Wallet and may not be a full on-chain
                  transaction hash. You can track it in the wallet activity view.
                </p>
              ) : (
                <p className="text-xs opacity-70 mt-2">
                  Waiting for transaction to finalize... The explorer link will appear once confirmed.
                </p>
              )}
            </div>
          )}

          {vaultWithdrawTxId && (
            <div className="rounded-xl bg-base-200 p-4 max-w-xl border-l-4 border-success">
              <h3 className="font-semibold mb-2">Vault transfer (credits to your wallet)</h3>
              <p className="text-xs opacity-80 mb-2">
                Backend sent ALEO from the pool vault to your wallet. Transaction:
              </p>
              <pre className="text-xs whitespace-pre-wrap break-all bg-base-300 p-2 rounded mb-2">
                {vaultWithdrawTxId}
              </pre>
              <a
                href={getProvableExplorerTxUrl(vaultWithdrawTxId)}
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary text-sm inline-block"
              >
                View on Provable Explorer →
              </a>
            </div>
          )}

          {vaultBorrowTxId && (
            <div className="rounded-xl bg-base-200 p-4 max-w-xl border-l-4 border-info">
              <h3 className="font-semibold mb-2">Vault borrow (credits to your wallet)</h3>
              <p className="text-xs opacity-80 mb-2">
                Backend sent borrowed ALEO from the pool vault to your wallet. Transaction:
              </p>
              <pre className="text-xs whitespace-pre-wrap break-all bg-base-300 p-2 rounded mb-2">
                {vaultBorrowTxId}
              </pre>
              <a
                href={getProvableExplorerTxUrl(vaultBorrowTxId)}
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary text-sm inline-block"
              >
                View on Provable Explorer →
              </a>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Simple loading overlay for prod */}
          {loading && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
              <div className="rounded-xl bg-base-200 px-6 py-4 flex flex-col items-center gap-2 shadow-lg">
                <span className="loading loading-spinner loading-md" />
                <p className="text-sm opacity-80">Processing transaction...</p>
              </div>
            </div>
          )}

          {/* Minimal toast-style status message for prod (bottom-right) */}
          {statusMessage && !loading && (
            <div className="fixed bottom-4 right-4 z-40 rounded-lg bg-base-200 px-4 py-2 shadow-lg text-sm">
              {statusMessage}
            </div>
          )}
        </>
      )}
    </div>
  );
};

DashboardPage.getLayout = (page) => <Layout>{page}</Layout>;

export default DashboardPage;

