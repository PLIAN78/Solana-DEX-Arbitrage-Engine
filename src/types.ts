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