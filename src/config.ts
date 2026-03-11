import dotenv from "dotenv";

dotenv.config();

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const CONFIG = {
  pollIntervalMs: Number(getEnv("POLL_INTERVAL_MS", "3000")),
  csvPath: getEnv("CSV_PATH", "./data/sol_usdc_spreads.csv"),
  searchQuery: getEnv("SEARCH_QUERY", "SOL/USDC"),
  minLiquidityUsd: Number(getEnv("MIN_LIQUIDITY_USD", "100000"))
};