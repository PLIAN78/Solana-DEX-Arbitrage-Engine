import axios from "axios";
import { CONFIG } from "./config";
import { DexPair, DexScreenerSearchResponse, QuoteSnapshot } from "./types";

const DEXSCREENER_SEARCH_URL = "https://api.dexscreener.com/latest/dex/search";

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function isSolLike(symbol: string): boolean {
  const s = normalizeSymbol(symbol);
  return s === "SOL" || s === "WSOL";
}

function isUsdcLike(symbol: string): boolean {
  return normalizeSymbol(symbol) === "USDC";
}

function isSolUsdcPair(pair: DexPair): boolean {
  const a = normalizeSymbol(pair.baseToken.symbol);
  const b = normalizeSymbol(pair.quoteToken.symbol);

  return (
    (isSolLike(a) && isUsdcLike(b)) ||
    (isUsdcLike(a) && isSolLike(b))
  );
}

function normalizePriceToUsd(pair: DexPair): number | null {
  if (!pair.priceUsd) return null;

  const raw = Number(pair.priceUsd);
  if (!Number.isFinite(raw) || raw <= 0) return null;

  return raw;
}

function getLiquidityUsd(pair: DexPair): number {
  return Number(pair.liquidity?.usd ?? 0);
}

function debugPairs(pairs: DexPair[], dexId: "orca" | "raydium"): void {
  const relevant = pairs
    .filter((pair) => pair.chainId === "solana")
    .filter((pair) => pair.dexId.toLowerCase().includes(dexId))
    .map((pair) => ({
      dexId: pair.dexId,
      base: pair.baseToken.symbol,
      quote: pair.quoteToken.symbol,
      liquidityUsd: getLiquidityUsd(pair),
      priceUsd: pair.priceUsd,
      pairAddress: pair.pairAddress
    }));

  console.log(`\n[debug] ${dexId} candidate pairs from DexScreener:`);
  if (relevant.length === 0) {
    console.log("[debug] none found");
    return;
  }

  for (const row of relevant.slice(0, 10)) {
    console.log(row);
  }
}

function selectBestPair(
  pairs: DexPair[],
  dexId: "orca" | "raydium"
): QuoteSnapshot | null {
  const candidates: QuoteSnapshot[] = [];

  for (const pair of pairs) {
    if (pair.chainId !== "solana") continue;

    // looser match in case DexScreener uses something like "orca" / "orca-whirlpool"
    if (!pair.dexId.toLowerCase().includes(dexId)) continue;

    if (!isSolUsdcPair(pair)) continue;
    if (getLiquidityUsd(pair) < CONFIG.minLiquidityUsd) continue;

    const priceUsd = normalizePriceToUsd(pair);
    if (priceUsd === null) continue;

    candidates.push({
      dex: dexId,
      pairAddress: pair.pairAddress,
      priceUsd,
      liquidityUsd: getLiquidityUsd(pair),
      url: pair.url
    });
  }

  candidates.sort((a, b) => b.liquidityUsd - a.liquidityUsd);

  return candidates[0] ?? null;
}

export async function fetchQuotes(): Promise<{
  orca: QuoteSnapshot | null;
  raydium: QuoteSnapshot | null;
  rawCount: number;
}> {
  const response = await axios.get<DexScreenerSearchResponse>(
    DEXSCREENER_SEARCH_URL,
    {
      params: { q: CONFIG.searchQuery },
      timeout: 10_000
    }
  );

  const pairs = response.data.pairs ?? [];

  const orca = selectBestPair(pairs, "orca");
  const raydium = selectBestPair(pairs, "raydium");

  if (!orca) {
    debugPairs(pairs, "orca");
  }

  if (!raydium) {
    debugPairs(pairs, "raydium");
  }

  return {
    orca,
    raydium,
    rawCount: pairs.length
  };
}