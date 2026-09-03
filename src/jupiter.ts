import axios from "axios";
import type { AxiosInstance } from "axios";
import { CONFIG } from "./config";
import type { JupiterQuote, TimedQuote, Venue } from "./types";

export interface QuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: bigint;
  venue: Venue;
}

export interface QuoteProvider {
  getQuote(request: QuoteRequest): Promise<TimedQuote>;
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

export class JupiterClient implements QuoteProvider {
  private readonly http: AxiosInstance;

  constructor(http?: AxiosInstance) {
    if (!http && (!CONFIG.jupiterApiKey || !CONFIG.paperWalletAddress)) {
      throw new Error(
        "Set JUPITER_API_KEY and PAPER_WALLET_ADDRESS in .env before running the scanner"
      );
    }
    this.http =
      http ??
      axios.create({
        baseURL: CONFIG.jupiterBaseUrl,
        timeout: CONFIG.requestTimeoutMs,
        headers: { "x-api-key": CONFIG.jupiterApiKey }
      });
  }

  async getQuote(request: QuoteRequest): Promise<TimedQuote> {
    const requestedAtMs = Date.now();
    const allowedDexes = CONFIG.dexes[request.venue];
    const response = await this.http.get<JupiterQuote>("/swap/v2/build", {
      params: {
        inputMint: request.inputMint,
        outputMint: request.outputMint,
        amount: request.amount.toString(),
        taker: CONFIG.paperWalletAddress!,
        slippageBps: CONFIG.slippageBps.toString(),
        dexes: allowedDexes.join(","),
        wrapAndUnwrapSol: "true"
      }
    });
    const receivedAtMs = Date.now();
    const quote = response.data;

    this.validateQuote(quote, request, allowedDexes);
    return { venue: request.venue, requestedAtMs, receivedAtMs, quote };
  }

  private validateQuote(
    quote: JupiterQuote,
    request: QuoteRequest,
    allowedDexes: readonly string[]
  ): void {
    if (!quote || !Array.isArray(quote.routePlan) || quote.routePlan.length === 0) {
      throw new Error(`Jupiter returned no ${request.venue} route`);
    }
    if (
      quote.inputMint !== request.inputMint ||
      quote.outputMint !== request.outputMint ||
      quote.inAmount !== request.amount.toString()
    ) {
      throw new Error(`Jupiter returned a mismatched ${request.venue} quote`);
    }

    const allowed = new Set(allowedDexes.map(normalizeLabel));
    const unexpected = quote.routePlan
      .map((part) => part.swapInfo.label)
      .filter((label) => !allowed.has(normalizeLabel(label)));
    if (unexpected.length > 0) {
      throw new Error(
        `Jupiter route escaped ${request.venue}: ${[...new Set(unexpected)].join(", ")}`
      );
    }

    for (const field of [quote.outAmount, quote.otherAmountThreshold]) {
      if (!/^\d+$/.test(field) || BigInt(field) <= 0n) {
        throw new Error(`Jupiter returned an invalid amount for ${request.venue}`);
      }
    }
  }
}
