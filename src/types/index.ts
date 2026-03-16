import type { NextPage } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { Network } from '@provablehq/aleo-types';

//Change to Network.MAINNET for mainnet or Network.TESTNET for testnet
export const CURRENT_NETWORK: Network = Network.TESTNET;


// Default Aleo RPC host for testnet-beta used by the starter template.
// This is the endpoint that supports the custom JSON-RPC methods used in `rpc.ts`
// such as `executeTransition`, `getMappingValue`, and `aleoTransactionsForProgram`.
export const CURRENT_RPC_URL = "https://testnetbeta.aleorpc.com";

export type NextPageWithLayout<P = {}> = NextPage<P> & {
  authorization?: boolean;
  getLayout?: (page: ReactElement) => ReactNode;
};

// src/types/index.ts
export type ProposalData = {
  bountyId: number;
  proposalId: number;
  proposerAddress: string;
  proposalText?: string;
  fileName?: string;
  fileUrl?: string;
  status?: string;
  rewardSent?: boolean;
};

export type BountyData = {
  id: number;
  title: string;
  reward: string;
  deadline: string;
  creatorAddress: string;
  proposals?: ProposalData[];
};

// Aleo program ID for the first lending pool (lending_pool_v86: micro-ALEO amounts, real interest/APY, on-chain block.height).
export const BOUNTY_PROGRAM_ID = 'lending_pool_v86.aleo';

// USDC pool program: lending_pool_usdce_v86.aleo — v86-style interest/APY, on-chain block.height, scaled balances.
export const USDC_POOL_PROGRAM_ID = 'lending_pool_usdce_v86.aleo';

// USDCx token program (Provable testnet): required for Token records used in USDC pool deposit/repay/withdraw/borrow.
export const USDC_TOKEN_PROGRAM_ID = 'test_usdcx_stablecoin.aleo';
