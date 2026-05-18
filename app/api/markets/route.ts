import { NextResponse } from "next/server";
import {
  deriveLiquidity,
  deriveMarketSignal,
  HYPERLIQUID_ENDPOINTS,
  marketSnapshots,
  trackedMarkets,
  type MarketSnapshot,
} from "@/lib/hyperliquid";

type HyperliquidAssetContext = {
  markPx?: string;
  midPx?: string;
  prevDayPx?: string;
  funding?: string;
  openInterest?: string;
};

type HyperliquidMetaResponse = [
  {
    universe: { name: string }[];
  },
  HyperliquidAssetContext[],
];

async function fetchHyperliquidMarkets(): Promise<MarketSnapshot[]> {
  const [midsResponse, contextsResponse] = await Promise.all([
    fetch(HYPERLIQUID_ENDPOINTS.mainnet.info, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "allMids" }),
      cache: "no-store",
    }),
    fetch(HYPERLIQUID_ENDPOINTS.mainnet.info, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      cache: "no-store",
    }),
  ]);

  if (!midsResponse.ok || !contextsResponse.ok) {
    throw new Error("Hyperliquid market data request failed");
  }

  const mids = (await midsResponse.json()) as Record<string, string>;
  const [meta, contexts] = (await contextsResponse.json()) as HyperliquidMetaResponse;

  return trackedMarkets.map((coin) => {
    const index = meta.universe.findIndex((asset) => asset.name === coin);
    const context = index >= 0 ? contexts[index] : undefined;
    const markPx = Number(context?.markPx ?? context?.midPx ?? mids[coin]);
    const prevDayPx = Number(context?.prevDayPx ?? markPx);
    const funding8h = Number(context?.funding ?? 0) * 100;
    const openInterestUsd = Number(context?.openInterest ?? 0) * markPx;
    const change24h = prevDayPx > 0 ? ((markPx - prevDayPx) / prevDayPx) * 100 : 0;

    return {
      coin,
      markPx,
      change24h,
      funding8h,
      openInterestUsd,
      liquidity: deriveLiquidity(openInterestUsd),
      signal: deriveMarketSignal(change24h, funding8h),
      source: "live",
    };
  });
}

export async function GET() {
  try {
    return NextResponse.json({
      network: "mainnet-market-data",
      docsBackedEndpoints: HYPERLIQUID_ENDPOINTS,
      markets: await fetchHyperliquidMarkets(),
      source: "hyperliquid-live",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        network: "fallback",
        docsBackedEndpoints: HYPERLIQUID_ENDPOINTS,
        markets: marketSnapshots.map((market) => ({ ...market, source: "fallback" })),
        source: "local-fallback",
        error: error instanceof Error ? error.message : "Unknown market data error",
        updatedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  }
}
