import { NextRequest, NextResponse } from "next/server";
import { defaultGuardrails, marketSnapshots } from "@/lib/hyperliquid";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
    market?: string;
    markPx?: number;
    change24h?: number;
    funding8h?: number;
    openInterestUsd?: number;
    notionalUsd?: number;
    leverage?: number;
    stopLossPct?: number;
    takeProfitPct?: number;
    maxLossUsd?: number;
    strategyMode?: "Conservative" | "Balanced" | "Aggressive";
  };

  const fallbackMarket =
    marketSnapshots.find((item) => item.coin === body.market) ?? marketSnapshots[0];
  const market = {
    ...fallbackMarket,
    markPx: Number.isFinite(body.markPx) ? Number(body.markPx) : fallbackMarket.markPx,
    change24h: Number.isFinite(body.change24h)
      ? Number(body.change24h)
      : fallbackMarket.change24h,
    funding8h: Number.isFinite(body.funding8h)
      ? Number(body.funding8h)
      : fallbackMarket.funding8h,
    openInterestUsd: Number.isFinite(body.openInterestUsd)
      ? Number(body.openInterestUsd)
      : fallbackMarket.openInterestUsd,
  };
  const notionalUsd = Number(body.notionalUsd ?? 250);
  const leverage = Number(body.leverage ?? 2);
  const stopLossPct = Math.min(Math.max(Number(body.stopLossPct ?? 1.4), 0.2), 15);
  const takeProfitPct = Math.min(Math.max(Number(body.takeProfitPct ?? 2.6), 0.4), 30);
  const maxLossUsd = Math.min(
    Math.max(Number(body.maxLossUsd ?? notionalUsd * (stopLossPct / 100) * leverage), 1),
    defaultGuardrails.maxDailyLossUsd,
  );
  const strategyMode = body.strategyMode ?? "Conservative";
  const violations = [
    notionalUsd > defaultGuardrails.maxNotionalUsd
      ? `Notional exceeds ${defaultGuardrails.maxNotionalUsd} USD limit`
      : null,
    leverage > defaultGuardrails.maxLeverage
      ? `Leverage exceeds ${defaultGuardrails.maxLeverage}x limit`
      : null,
    defaultGuardrails.allowedMarkets.includes(market.coin)
      ? null
      : `${market.coin} is outside the allowed market list`,
    maxLossUsd > defaultGuardrails.maxDailyLossUsd
      ? `Max loss exceeds ${defaultGuardrails.maxDailyLossUsd} USD daily loss cap`
      : null,
  ].filter(Boolean);

  const direction =
    market.signal === "Momentum"
      ? "long continuation"
      : market.signal === "Mean reversion"
        ? "small counter-trend long"
        : "no trade";
  const side = direction === "no trade" ? null : "buy";
  const entryPrice = market.markPx * 0.998;
  const stopLoss = entryPrice * (1 - stopLossPct / 100);
  const takeProfit = entryPrice * (1 + takeProfitPct / 100);
  const estimatedLossUsd = notionalUsd * (stopLossPct / 100) * leverage;
  const canStage = violations.length === 0 && direction !== "no trade";

  return NextResponse.json({
    summary:
      violations.length > 0
        ? "The agent blocked this idea because it violates account guardrails."
        : `The agent would stage a ${direction} idea on ${market.coin}, then wait for explicit user approval.`,
    confidence: market.signal === "Wait" || market.signal === "Risk-off" ? 42 : 68,
    action: canStage ? "notify-user-for-approval" : "do-not-submit",
    rationale: [
      `${market.coin} has a ${market.change24h.toFixed(2)}% 24h move with ${market.liquidity.toLowerCase()} liquidity.`,
      `Funding is ${market.funding8h.toFixed(3)}% over 8h, so the strategy sizes conservatively.`,
      `${strategyMode} risk tuning uses a ${stopLossPct.toFixed(2)}% stop, ${takeProfitPct.toFixed(2)}% target, and ${maxLossUsd.toFixed(2)} USD max-loss cap.`,
      "The LLM produces analysis only; deterministic policy code decides whether an order can be staged.",
    ],
    riskChecks: {
      passed: violations.length === 0,
      violations,
      humanApprovalRequired: defaultGuardrails.requireHumanApproval,
    },
    stagedOrder:
      canStage
        ? {
            id: `ticket-${Date.now()}`,
            market: `${market.coin}-PERP`,
            side,
            notionalUsd,
            leverage,
            orderType: "limit",
            entryPrice,
            stopLoss,
            takeProfit,
            maxLossUsd: Math.min(maxLossUsd, estimatedLossUsd),
            stopLossPct,
            takeProfitPct,
            strategyMode,
            reason: `${market.coin} shows a ${market.signal.toLowerCase()} setup with ${strategyMode.toLowerCase()} risk tuning and predefined invalidation.`,
            mode: defaultGuardrails.mode,
            requiresApproval: defaultGuardrails.requireHumanApproval,
          }
        : null,
  });
}
