import { CONFIG } from "./config";
import { fetchQuotes } from "./dexscreener";
import { appendSpreadRow } from "./csv";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logOneCycle(): Promise<void> {
  const now = new Date().toISOString();

  try {
    const { orca, raydium, rawCount } = await fetchQuotes();

    if (!orca || !raydium) {
      console.warn(
        `[${now}] Missing quote. rawPairs=${rawCount} orca=${Boolean(orca)} raydium=${Boolean(raydium)}`
      );
      return;
    }

    const absSpreadUsd = Math.abs(orca.priceUsd - raydium.priceUsd);
    const mid = (orca.priceUsd + raydium.priceUsd) / 2;
    const spreadPct = mid > 0 ? (absSpreadUsd / mid) * 100 : 0;

    const cheaperDex = orca.priceUsd < raydium.priceUsd ? "orca" : "raydium";
    const expensiveDex = cheaperDex === "orca" ? "raydium" : "orca";

    await appendSpreadRow({
      timestamp: now,
      orcaPriceUsd: orca.priceUsd,
      raydiumPriceUsd: raydium.priceUsd,
      absSpreadUsd,
      spreadPct,
      cheaperDex,
      expensiveDex,
      orcaLiquidityUsd: orca.liquidityUsd,
      raydiumLiquidityUsd: raydium.liquidityUsd,
      orcaPairAddress: orca.pairAddress,
      raydiumPairAddress: raydium.pairAddress
    });

    console.log(
      `[${now}] ORCA=${orca.priceUsd.toFixed(4)} | RAYDIUM=${raydium.priceUsd.toFixed(4)} | spread=$${absSpreadUsd.toFixed(6)} (${spreadPct.toFixed(4)}%) | buy=${cheaperDex} sell=${expensiveDex}`
    );
  } catch (error) {
    console.error(`[${now}] Failed to fetch/log quotes`, error);
  }
}

async function main(): Promise<void> {
  console.log("Starting SOL/USDC spread logger...");
  console.log(`Polling every ${CONFIG.pollIntervalMs} ms`);
  console.log(`Writing CSV to ${CONFIG.csvPath}`);
  console.log("");

  while (true) {
    await logOneCycle();
    await sleep(CONFIG.pollIntervalMs);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});