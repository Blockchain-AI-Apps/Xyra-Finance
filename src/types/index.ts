import type { NextPage } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { Network } from '@provablehq/aleo-types';
import { PROGRAMS } from '@/config/programs';

export { PROGRAMS, ALL_PROGRAMS } from '@/config/programs';

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

// Backward-compatible aliases — prefer importing PROGRAMS from '@/config/programs' directly.
export const BOUNTY_PROGRAM_ID = PROGRAMS.LENDING_POOL;
export const USDC_POOL_PROGRAM_ID = PROGRAMS.USDC_POOL;
export const USDC_TOKEN_PROGRAM_ID = PROGRAMS.USDC_TOKEN;
