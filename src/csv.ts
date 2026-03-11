import fs from "fs";
import path from "path";
import { createObjectCsvWriter } from "csv-writer";
import { CONFIG } from "./config";

function ensureDirectoryExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export async function appendSpreadRow(row: {
  timestamp: string;
  orcaPriceUsd: number;
  raydiumPriceUsd: number;
  absSpreadUsd: number;
  spreadPct: number;
  cheaperDex: string;
  expensiveDex: string;
  orcaLiquidityUsd: number;
  raydiumLiquidityUsd: number;
  orcaPairAddress: string;
  raydiumPairAddress: string;
}): Promise<void> {
  ensureDirectoryExists(CONFIG.csvPath);

  const csvWriter = createObjectCsvWriter({
    path: CONFIG.csvPath,
    header: [
      { id: "timestamp", title: "timestamp" },
      { id: "orcaPriceUsd", title: "orca_price_usd" },
      { id: "raydiumPriceUsd", title: "raydium_price_usd" },
      { id: "absSpreadUsd", title: "abs_spread_usd" },
      { id: "spreadPct", title: "spread_pct" },
      { id: "cheaperDex", title: "cheaper_dex" },
      { id: "expensiveDex", title: "expensive_dex" },
      { id: "orcaLiquidityUsd", title: "orca_liquidity_usd" },
      { id: "raydiumLiquidityUsd", title: "raydium_liquidity_usd" },
      { id: "orcaPairAddress", title: "orca_pair_address" },
      { id: "raydiumPairAddress", title: "raydium_pair_address" }
    ],
    append: fileExists(CONFIG.csvPath)
  });

  await csvWriter.writeRecords([row]);
}