/**
 * Aleo Program IDs — Single source of truth.
 * Change these when deploying new contract versions.
 */
export const PROGRAMS = {
  /** Credits pool (ALEO deposits/withdraws/borrows/repays) */
  LENDING_POOL: 'lending_pool_v91.aleo',
  /** USDC pool (USDCx deposits/withdraws/borrows/repays) */
  USDC_POOL: 'lending_pool_usdce_v86.aleo',
  /** USDCx stablecoin token program */
  USDC_TOKEN: 'test_usdcx_stablecoin.aleo',
  /** Aleo native credits program */
  CREDITS: 'credits.aleo',
} as const;

/** All program IDs as array — used by wallet adapter registration */
export const ALL_PROGRAMS: string[] = Object.values(PROGRAMS);
