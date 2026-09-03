export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
}

export interface DexPair {
  chainId: string;
  dexId: string;
  url?: string;
  pairAddress: string;
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  priceNative?: string;
  priceUsd?: string | null;
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  volume?: Record<string, number>;
  txns?: Record<string, { buys: number; sells: number }>;
}

export interface DexScreenerSearchResponse {
  schemaVersion?: string;
  pairs?: DexPair[];
}

export interface QuoteSnapshot {
  dex: "orca" | "raydium";
  pairAddress: string;
  priceUsd: number;
  liquidityUsd: number;
  url?: string;
}

export type Venue = "orca" | "raydium";

export interface JupiterSwapInfo {
  ammKey: string;
  label: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  feeAmount: string;
  feeMint: string;
}

export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: JupiterSwapInfo;
    percent: number;
  }>;
  contextSlot?: number;
  timeTaken?: number;
}

export interface TimedQuote {
  venue: Venue;
  requestedAtMs: number;
  receivedAtMs: number;
  quote: JupiterQuote;
}

export interface PaperCycle {
  timestamp: string;
  sellSolOn: Venue;
  buySolOn: Venue;
  startLamports: bigint;
  expectedEndLamports: bigint;
  conservativeEndLamports: bigint;
  networkCostLamports: bigint;
  executionBufferLamports: bigint;
  expectedGrossProfitLamports: bigint;
  conservativeNetProfitLamports: bigint;
  netProfitBps: number;
  quoteWindowMs: number;
  maxPriceImpactPct: number;
  qualifies: boolean;
  rejectionReason: string;
  firstLegLabels: string[];
  secondLegLabels: string[];
  contextSlots: number[];
}
