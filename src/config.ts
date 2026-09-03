import dotenv from "dotenv";

dotenv.config();

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getNumber(name: string, fallback: string): number {
  const raw = getEnv(name, fallback);
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number (received ${JSON.stringify(raw)})`);
  }
  return value;
}

function getNonNegativeNumber(name: string, fallback: string): number {
  const value = getNumber(name, fallback);
  if (value < 0) {
    throw new Error(`${name} must be greater than or equal to zero`);
  }
  return value;
}

function getPositiveInteger(name: string, fallback: string): number {
  const value = getNumber(name, fallback);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function getBigInt(name: string, fallback: string): bigint {
  const raw = getEnv(name, fallback);
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return BigInt(raw);
}

function getList(name: string, fallback: string): string[] {
  const values = getEnv(name, fallback)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) {
    throw new Error(`${name} must contain at least one Jupiter DEX label`);
  }
  return values;
}

function solToLamports(value: number): bigint {
  if (value <= 0) {
    throw new Error("TRADE_SIZE_SOL must be greater than zero");
  }
  const lamports = value * 1_000_000_000;
  if (!Number.isSafeInteger(lamports)) {
    throw new Error("TRADE_SIZE_SOL must resolve to a whole, safe number of lamports");
  }
  return BigInt(lamports);
}

export const MINTS = {
  sol: "So11111111111111111111111111111111111111112",
  usdc: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
} as const;

const tradeSizeSol = getNumber("TRADE_SIZE_SOL", "0.1");

export const CONFIG = {
  jupiterApiKey: process.env.JUPITER_API_KEY?.trim() || undefined,
  paperWalletAddress: process.env.PAPER_WALLET_ADDRESS?.trim() || undefined,
  jupiterBaseUrl: getEnv("JUPITER_BASE_URL", "https://api.jup.ag"),
  tradeSizeLamports: solToLamports(tradeSizeSol),
  slippageBps: getNonNegativeNumber("SLIPPAGE_BPS", "30"),
  executionBufferBps: getNonNegativeNumber("EXECUTION_BUFFER_BPS", "10"),
  minNetProfitBps: getNonNegativeNumber("MIN_NET_PROFIT_BPS", "5"),
  transactionFeeLamports: getBigInt("TRANSACTION_FEE_LAMPORTS", "5000"),
  maxQuoteWindowMs: getPositiveInteger("MAX_QUOTE_WINDOW_MS", "2000"),
  requestTimeoutMs: getPositiveInteger("REQUEST_TIMEOUT_MS", "10000"),
  dexes: {
    orca: getList("ORCA_DEXES", "Orca V2,Whirlpool"),
    raydium: getList("RAYDIUM_DEXES", "Raydium,Raydium CLMM,Raydium CP")
  },
  pollIntervalMs: getPositiveInteger("POLL_INTERVAL_MS", "3000"),
  csvPath: getEnv("CSV_PATH", "./data/sol_usdc_spreads.csv"),
  searchQuery: getEnv("SEARCH_QUERY", "SOL/USDC"),
  minLiquidityUsd: getNonNegativeNumber("MIN_LIQUIDITY_USD", "100000")
};
