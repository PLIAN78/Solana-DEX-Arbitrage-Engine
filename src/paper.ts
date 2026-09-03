import { CONFIG, MINTS } from "./config";
import type { QuoteProvider } from "./jupiter";
import type { PaperCycle, TimedQuote, Venue } from "./types";
export interface CycleQuotes {
  firstLeg: TimedQuote;
  expectedSecondLeg: TimedQuote;
  conservativeSecondLeg: TimedQuote;
}

function labels(quote: TimedQuote): string[] {
  return [...new Set(quote.quote.routePlan.map((part) => part.swapInfo.label))];
}

function toBps(numerator: bigint, denominator: bigint): number {
  return Number((numerator * 1_000_000n) / denominator) / 100;
}

export function evaluateCycle(
  sellSolOn: Venue,
  buySolOn: Venue,
  quotes: CycleQuotes,
  now = new Date()
): PaperCycle {
  const startLamports = BigInt(quotes.firstLeg.quote.inAmount);
  const expectedEndLamports = BigInt(quotes.expectedSecondLeg.quote.outAmount);
  const conservativeEndLamports = BigInt(
    quotes.conservativeSecondLeg.quote.otherAmountThreshold
  );
  const networkCostLamports = CONFIG.transactionFeeLamports * 2n;
  const executionBufferLamports =
    (conservativeEndLamports * BigInt(Math.round(CONFIG.executionBufferBps))) / 10_000n;
  const expectedGrossProfitLamports = expectedEndLamports - startLamports;
  const conservativeNetProfitLamports =
    conservativeEndLamports - startLamports - networkCostLamports - executionBufferLamports;
  const netProfitBps = toBps(conservativeNetProfitLamports, startLamports);

  const allQuotes = [
    quotes.firstLeg,
    quotes.expectedSecondLeg,
    quotes.conservativeSecondLeg
  ];
  const quoteWindowMs =
    Math.max(...allQuotes.map((quote) => quote.receivedAtMs)) -
    Math.min(...allQuotes.map((quote) => quote.requestedAtMs));
  const maxPriceImpactPct = Math.max(
    ...allQuotes.map((quote) => Number(quote.quote.priceImpactPct || 0))
  );
  const contextSlots = allQuotes
    .map((quote) => quote.quote.contextSlot)
    .filter((slot): slot is number => typeof slot === "number");

  let rejectionReason = "";
  if (quoteWindowMs > CONFIG.maxQuoteWindowMs) {
    rejectionReason = "quote_window_too_slow";
  } else if (conservativeNetProfitLamports <= 0n) {
    rejectionReason = "not_profitable_after_costs";
  } else if (netProfitBps < CONFIG.minNetProfitBps) {
    rejectionReason = "below_min_profit_threshold";
  }

  return {
    timestamp: now.toISOString(),
    sellSolOn,
    buySolOn,
    startLamports,
    expectedEndLamports,
    conservativeEndLamports,
    networkCostLamports,
    executionBufferLamports,
    expectedGrossProfitLamports,
    conservativeNetProfitLamports,
    netProfitBps,
    quoteWindowMs,
    maxPriceImpactPct,
    qualifies: rejectionReason === "",
    rejectionReason,
    firstLegLabels: labels(quotes.firstLeg),
    secondLegLabels: labels(quotes.conservativeSecondLeg),
    contextSlots
  };
}

export async function scanCycle(
  provider: QuoteProvider,
  sellSolOn: Venue,
  buySolOn: Venue
): Promise<PaperCycle> {
  const firstLeg = await provider.getQuote({
    inputMint: MINTS.sol,
    outputMint: MINTS.usdc,
    amount: CONFIG.tradeSizeLamports,
    venue: sellSolOn
  });

  const expectedUsdc = BigInt(firstLeg.quote.outAmount);
  const conservativeUsdc = BigInt(firstLeg.quote.otherAmountThreshold);
  const [expectedSecondLeg, conservativeSecondLeg] = await Promise.all([
    provider.getQuote({
      inputMint: MINTS.usdc,
      outputMint: MINTS.sol,
      amount: expectedUsdc,
      venue: buySolOn
    }),
    provider.getQuote({
      inputMint: MINTS.usdc,
      outputMint: MINTS.sol,
      amount: conservativeUsdc,
      venue: buySolOn
    })
  ]);

  return evaluateCycle(sellSolOn, buySolOn, {
    firstLeg,
    expectedSecondLeg,
    conservativeSecondLeg
  });
}