"use client";

import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Cpu,
  History,
  Gauge,
  LineChart,
  Lock,
  Radio,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  WalletCards,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  defaultGuardrails,
  deriveLiquidity,
  deriveMarketSignal,
  formatCompactUsd,
  formatUsd,
  HYPERLIQUID_ENDPOINTS,
  marketSnapshots,
  trackedMarkets,
  type MarketSnapshot,
} from "@/lib/hyperliquid";

type AgentResponse = {
  summary: string;
  confidence: number;
  action: string;
  rationale: string[];
  riskChecks: {
    passed: boolean;
    violations: string[];
    humanApprovalRequired: boolean;
  };
  stagedOrder: null | {
    id: string;
    market: string;
    side: "buy" | "sell" | null;
    notionalUsd: number;
    leverage: number;
    orderType: string;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    maxLossUsd: number;
    stopLossPct: number;
    takeProfitPct: number;
    strategyMode: StrategyMode;
    reason: string;
    mode: string;
    requiresApproval: boolean;
  };
};

type ApprovalStatus = "idle" | "pending" | "approved" | "rejected";
type StrategyMode = "Conservative" | "Balanced" | "Aggressive";

type MarketsResponse = {
  markets: MarketSnapshot[];
  source: "hyperliquid-live" | "local-fallback";
  updatedAt: string;
};

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

const navItems = [
  { label: "Markets", icon: LineChart },
  { label: "Agent", icon: Bot },
  { label: "Risk", icon: ShieldCheck },
  { label: "Wallet", icon: WalletCards },
];

const agentRuns = [
  { title: "Funding drift scan", status: "Passed", detail: "No crowded longs above policy threshold" },
  { title: "Liquidation map", status: "Watching", detail: "BTC liquidity cluster at 102.8K" },
  { title: "Position audit", status: "Clean", detail: "Daily loss budget has 81% remaining" },
];

const strategyModes: StrategyMode[] = ["Conservative", "Balanced", "Aggressive"];

const strategyDefaults: Record<
  StrategyMode,
  { leverage: number; stopLossPct: number; takeProfitPct: number; maxLossUsd: number }
> = {
  Conservative: { leverage: 2, stopLossPct: 1.2, takeProfitPct: 2.2, maxLossUsd: 40 },
  Balanced: { leverage: 3, stopLossPct: 1.8, takeProfitPct: 3.2, maxLossUsd: 75 },
  Aggressive: { leverage: 5, stopLossPct: 2.6, takeProfitPct: 5.0, maxLossUsd: 120 },
};

function MarketRow({
  market,
  selected,
  onSelect,
}: {
  market: MarketSnapshot;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button className={`market-row ${selected ? "selected" : ""}`} onClick={onSelect}>
      <span>
        <strong>{market.coin}</strong>
        <small>{market.signal}</small>
      </span>
      <span>{formatUsd(market.markPx)}</span>
      <span className={market.change24h >= 0 ? "positive" : "negative"}>
        {market.change24h >= 0 ? "+" : ""}
        {market.change24h.toFixed(2)}%
      </span>
      <span>{market.funding8h.toFixed(3)}%</span>
      <span>{formatCompactUsd(market.openInterestUsd)}</span>
    </button>
  );
}

async function fetchLiveHyperliquidMarkets(): Promise<MarketSnapshot[]> {
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
    throw new Error("Hyperliquid browser market request failed");
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

function analyzeLocally({
  market,
  notionalUsd,
  leverage,
  stopLossPct,
  takeProfitPct,
  maxLossUsd,
  strategyMode,
}: {
  market: MarketSnapshot;
  notionalUsd: number;
  leverage: number;
  stopLossPct: number;
  takeProfitPct: number;
  maxLossUsd: number;
  strategyMode: StrategyMode;
}): AgentResponse {
  const violations = [
    notionalUsd > defaultGuardrails.maxNotionalUsd
      ? `Notional exceeds ${defaultGuardrails.maxNotionalUsd} USD limit`
      : null,
    leverage > defaultGuardrails.maxLeverage
      ? `Leverage exceeds ${defaultGuardrails.maxLeverage}x limit`
      : null,
    maxLossUsd > defaultGuardrails.maxDailyLossUsd
      ? `Max loss exceeds ${defaultGuardrails.maxDailyLossUsd} USD daily loss cap`
      : null,
    defaultGuardrails.allowedMarkets.includes(market.coin)
      ? null
      : `${market.coin} is outside the allowed market list`,
  ].filter((violation): violation is string => Boolean(violation));
  const direction =
    market.signal === "Momentum"
      ? "long continuation"
      : market.signal === "Mean reversion"
        ? "small counter-trend long"
        : "no trade";
  const entryPrice = market.markPx * 0.998;
  const stopLoss = entryPrice * (1 - stopLossPct / 100);
  const takeProfit = entryPrice * (1 + takeProfitPct / 100);
  const estimatedLossUsd = notionalUsd * (stopLossPct / 100) * leverage;
  const canStage = violations.length === 0 && direction !== "no trade";

  return {
    summary: canStage
      ? `The agent would stage a ${direction} idea on ${market.coin}, then wait for explicit user approval.`
      : "The agent blocked this idea because it violates account guardrails.",
    confidence: market.signal === "Wait" || market.signal === "Risk-off" ? 42 : 68,
    action: canStage ? "notify-user-for-approval" : "do-not-submit",
    rationale: [
      `${market.coin} has a ${market.change24h.toFixed(2)}% 24h move with ${market.liquidity.toLowerCase()} liquidity.`,
      `Funding is ${market.funding8h.toFixed(3)}% over 8h, so the strategy sizes conservatively.`,
      `${strategyMode} risk tuning uses a ${stopLossPct.toFixed(2)}% stop, ${takeProfitPct.toFixed(2)}% target, and ${maxLossUsd.toFixed(2)} USD max-loss cap.`,
      "Static fallback mode is active; deterministic policy code still blocks unsafe staged orders.",
    ],
    riskChecks: {
      passed: violations.length === 0,
      violations,
      humanApprovalRequired: defaultGuardrails.requireHumanApproval,
    },
    stagedOrder: canStage
      ? {
          id: `ticket-${Date.now()}`,
          market: `${market.coin}-PERP`,
          side: "buy",
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
  };
}

export default function Home() {
  const [markets, setMarkets] = useState<MarketSnapshot[]>(marketSnapshots);
  const [marketSource, setMarketSource] = useState<MarketsResponse["source"]>("local-fallback");
  const [marketUpdatedAt, setMarketUpdatedAt] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  const [prompt, setPrompt] = useState(
    "Find a conservative intraday setup and explain why it should or should not be traded.",
  );
  const [notionalUsd, setNotionalUsd] = useState(300);
  const [leverage, setLeverage] = useState(2);
  const [stopLossPct, setStopLossPct] = useState(1.2);
  const [takeProfitPct, setTakeProfitPct] = useState(2.2);
  const [maxLossUsd, setMaxLossUsd] = useState(40);
  const [strategyMode, setStrategyMode] = useState<StrategyMode>("Conservative");
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("idle");
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedMarket = useMemo(
    () => markets.find((market) => market.coin === selectedCoin) ?? markets[0],
    [markets, selectedCoin],
  );

  useEffect(() => {
    let active = true;

    async function loadMarkets() {
      try {
        const liveMarkets = await fetchLiveHyperliquidMarkets();

        if (active) {
          setMarkets(liveMarkets);
          setMarketSource("hyperliquid-live");
          setMarketUpdatedAt(new Date().toISOString());
        }
      } catch {
        const response = await fetch("/api/markets", { cache: "no-store" });
        const data = (await response.json()) as MarketsResponse;

        if (active) {
          setMarkets(data.markets);
          setMarketSource(data.source);
          setMarketUpdatedAt(data.updatedAt);
        }
      }
    }

    loadMarkets().catch(() => {
      if (active) {
        setMarketSource("local-fallback");
      }
    });

    const interval = window.setInterval(loadMarkets, 30_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function runAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setApprovalStatus("idle");
    let analysis: AgentResponse;

    try {
      const response = await fetch("/api/agent/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          market: selectedMarket.coin,
          markPx: selectedMarket.markPx,
          change24h: selectedMarket.change24h,
          funding8h: selectedMarket.funding8h,
          openInterestUsd: selectedMarket.openInterestUsd,
          notionalUsd,
          leverage,
          stopLossPct,
          takeProfitPct,
          maxLossUsd,
          strategyMode,
        }),
      });

      if (!response.ok) {
        throw new Error("Agent API unavailable");
      }

      analysis = (await response.json()) as AgentResponse;
    } catch {
      analysis = analyzeLocally({
        market: selectedMarket,
        notionalUsd,
        leverage,
        stopLossPct,
        takeProfitPct,
        maxLossUsd,
        strategyMode,
      });
    }

    setAgentResponse(analysis);
    setApprovalStatus(analysis.stagedOrder ? "pending" : "idle");
    setLoading(false);
  }

  function approveTrade() {
    if (!agentResponse?.stagedOrder) {
      return;
    }

    setApprovalStatus("approved");
    setExecutionLog((current) => [
      `Approved ${agentResponse.stagedOrder?.market} ${agentResponse.stagedOrder?.side?.toUpperCase()} paper order`,
      "Policy re-check passed before simulated execution",
      "Paper execution queued for Hyperliquid adapter",
      ...current,
    ]);
  }

  function rejectTrade() {
    setApprovalStatus("rejected");
    setExecutionLog((current) => ["User rejected staged trade alert", ...current]);
  }

  function applyStrategyMode(mode: StrategyMode) {
    const defaults = strategyDefaults[mode];
    setStrategyMode(mode);
    setLeverage(defaults.leverage);
    setStopLossPct(defaults.stopLossPct);
    setTakeProfitPct(defaults.takeProfitPct);
    setMaxLossUsd(defaults.maxLossUsd);
    setApprovalStatus("idle");
  }

  function resetRiskTuning() {
    applyStrategyMode("Conservative");
    setNotionalUsd(300);
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Activity size={18} />
          </div>
          <span>Asteria</span>
        </div>
        <nav>
          {navItems.map((item) => (
            <button key={item.label} className={item.label === "Agent" ? "active" : ""}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="network-card">
          <Radio size={17} />
          <span>HL testnet-ready</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Hyperliquid agent terminal</p>
            <h1>AI trade ops with human approval at the edge.</h1>
          </div>
          <div className="top-actions">
            <div className="status-chip">
              <Sparkles size={15} />
              <span>Paper engine armed</span>
            </div>
            <div className="wallet-pill">
              <Lock size={16} />
              <span>Wallet not connected</span>
            </div>
          </div>
        </header>

        <section className="signal-strip">
          <span>
            <Terminal size={16} />
            Agent policy: approval required
          </span>
          <span>
            <Cpu size={16} />
            Execution adapter: simulated
          </span>
          <span>
            <Radio size={16} />
            Market feed: {marketSource === "hyperliquid-live" ? "Live Hyperliquid" : "Fallback"}
          </span>
        </section>

        <section className="metrics-grid">
          <div>
            <CircleDollarSign size={19} />
            <span>Paper equity</span>
            <strong>$10,000</strong>
          </div>
          <div>
            <Gauge size={19} />
            <span>Max leverage</span>
            <strong>{defaultGuardrails.maxLeverage}x</strong>
          </div>
          <div>
            <ShieldCheck size={19} />
            <span>Approval mode</span>
            <strong>Required</strong>
          </div>
          <div>
            <AlertTriangle size={19} />
            <span>Daily loss cap</span>
            <strong>{formatUsd(defaultGuardrails.maxDailyLossUsd)}</strong>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel markets-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Hyperliquid perps</p>
                <h2>Market scanner</h2>
              </div>
              {marketUpdatedAt ? (
                <span className="feed-time">
                  {new Date(marketUpdatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              ) : null}
              <button className="icon-button" title="Scanner filters">
                <SlidersHorizontal size={18} />
              </button>
            </div>
            <div className="market-table">
              <div className="market-head">
                <span>Market</span>
                <span>Mark</span>
                <span>24h</span>
                <span>Funding</span>
                <span>OI</span>
              </div>
              {markets.map((market) => (
                <MarketRow
                  key={market.coin}
                  market={market}
                  selected={selectedMarket.coin === market.coin}
                  onSelect={() => setSelectedCoin(market.coin)}
                />
              ))}
            </div>
          </div>

          <div className="panel agent-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">AI copilot</p>
                <h2>{selectedMarket.coin} agent brief</h2>
              </div>
              <span className={`signal ${selectedMarket.signal.toLowerCase().replace(" ", "-")}`}>
                {selectedMarket.signal}
              </span>
            </div>

            <form className="agent-form" onSubmit={runAgent}>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
              <div className="ticket-grid">
                <label>
                  <span>Notional USD</span>
                  <input
                    type="number"
                    min="25"
                    max="2500"
                    step="25"
                    value={notionalUsd}
                    onChange={(event) => setNotionalUsd(Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Leverage</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={leverage}
                    onChange={(event) => setLeverage(Number(event.target.value))}
                  />
                </label>
              </div>
              <button className="primary-button" type="submit" disabled={loading}>
                <Bot size={18} />
                <span>{loading ? "Analyzing" : "Run agent"}</span>
                <ChevronRight size={18} />
              </button>
            </form>

            <div className="agent-result">
              {agentResponse ? (
                <>
                  <div className="result-topline">
                    <strong>{agentResponse.summary}</strong>
                    <span>{agentResponse.confidence}% confidence</span>
                  </div>
                  <ul>
                    {agentResponse.rationale.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className={agentResponse.riskChecks.passed ? "check passed" : "check blocked"}>
                    {agentResponse.riskChecks.passed ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    <span>
                      {agentResponse.riskChecks.passed
                        ? "Policy passed. User approval is required before simulated execution."
                        : agentResponse.riskChecks.violations.join(", ")}
                    </span>
                  </div>

                  {agentResponse.stagedOrder ? (
                    <div className={`approval-ticket ${approvalStatus}`}>
                      <div className="ticket-title">
                        <span>
                          <strong>AI trade alert</strong>
                          <small>{approvalStatus === "pending" ? "Waiting for your decision" : approvalStatus}</small>
                        </span>
                        {approvalStatus === "pending" ? <Clock3 size={18} /> : <CheckCircle2 size={18} />}
                      </div>
                      <div className="order-grid">
                        <span>
                          Market
                          <strong>{agentResponse.stagedOrder.market}</strong>
                        </span>
                        <span>
                          Side
                          <strong>{agentResponse.stagedOrder.side?.toUpperCase()}</strong>
                        </span>
                        <span>
                          Entry
                          <strong>{formatUsd(agentResponse.stagedOrder.entryPrice)}</strong>
                        </span>
                        <span>
                          Size
                          <strong>{formatUsd(agentResponse.stagedOrder.notionalUsd)}</strong>
                        </span>
                        <span>
                          Leverage
                          <strong>{agentResponse.stagedOrder.leverage}x</strong>
                        </span>
                        <span>
                          Max loss
                          <strong>{formatUsd(agentResponse.stagedOrder.maxLossUsd)}</strong>
                        </span>
                        <span>
                          Risk mode
                          <strong>{agentResponse.stagedOrder.strategyMode}</strong>
                        </span>
                        <span>
                          Stop
                          <strong>{formatUsd(agentResponse.stagedOrder.stopLoss)}</strong>
                          <small>{agentResponse.stagedOrder.stopLossPct.toFixed(2)}%</small>
                        </span>
                        <span>
                          Target
                          <strong>{formatUsd(agentResponse.stagedOrder.takeProfit)}</strong>
                          <small>{agentResponse.stagedOrder.takeProfitPct.toFixed(2)}%</small>
                        </span>
                      </div>
                      <p>{agentResponse.stagedOrder.reason}</p>
                      <div className="approval-actions">
                        <button
                          className="approve-button"
                          type="button"
                          onClick={approveTrade}
                          disabled={approvalStatus !== "pending"}
                        >
                          <ThumbsUp size={17} />
                          <span>Approve paper trade</span>
                        </button>
                        <button
                          className="reject-button"
                          type="button"
                          onClick={rejectTrade}
                          disabled={approvalStatus !== "pending"}
                        >
                          <ThumbsDown size={17} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="empty-state">
                  <Bot size={26} />
                  <span>Ask the agent for a setup. It will analyze, run policy checks, and stage only paper orders.</span>
                </div>
              )}
            </div>
          </div>

          <div className="panel notification-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Notifications</p>
                <h2>Approval queue</h2>
              </div>
            </div>
            <div className="notification-body">
              {agentResponse?.stagedOrder ? (
                <>
                  <div className={`queue-item ${approvalStatus}`}>
                    <span>
                      <strong>{agentResponse.stagedOrder.market}</strong>
                      <small>
                        {approvalStatus === "pending"
                          ? "Needs user approval"
                          : approvalStatus === "approved"
                            ? "Approved and queued"
                            : "Rejected by user"}
                      </small>
                    </span>
                    <em>{agentResponse.stagedOrder.mode}</em>
                  </div>
                  <div className="notification-note">
                    The app will re-check policy after approval before any exchange adapter receives an order.
                  </div>
                </>
              ) : (
                <div className="notification-note">No pending trade alerts.</div>
              )}
            </div>
          </div>

          <div className="panel risk-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Risk tuning</p>
                <h2>Trade controls</h2>
              </div>
              <button className="icon-button" title="Reset risk tuning" type="button" onClick={resetRiskTuning}>
                <RotateCcw size={17} />
              </button>
            </div>
            <div className="mode-tabs" aria-label="Strategy mode">
              {strategyModes.map((mode) => (
                <button
                  key={mode}
                  className={strategyMode === mode ? "selected" : ""}
                  type="button"
                  onClick={() => applyStrategyMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="risk-controls">
              <label>
                <span>Stop loss %</span>
                <input
                  type="number"
                  min="0.2"
                  max="15"
                  step="0.1"
                  value={stopLossPct}
                  onChange={(event) => setStopLossPct(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Take profit %</span>
                <input
                  type="number"
                  min="0.4"
                  max="30"
                  step="0.1"
                  value={takeProfitPct}
                  onChange={(event) => setTakeProfitPct(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Max loss USD</span>
                <input
                  type="number"
                  min="1"
                  max={defaultGuardrails.maxDailyLossUsd}
                  step="5"
                  value={maxLossUsd}
                  onChange={(event) => setMaxLossUsd(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Leverage cap</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={leverage}
                  onChange={(event) => setLeverage(Number(event.target.value))}
                />
              </label>
            </div>
            <div className="risk-preview">
              <span>
                Estimated max loss
                <strong>{formatUsd(notionalUsd * (stopLossPct / 100) * leverage)}</strong>
              </span>
              <span>
                Reward/risk
                <strong>{(takeProfitPct / stopLossPct).toFixed(2)}x</strong>
              </span>
            </div>
            <div className="rules-list compact">
              <div>
                <span>Mode</span>
                <strong>Paper trading</strong>
              </div>
              <div>
                <span>Max order</span>
                <strong>{formatUsd(defaultGuardrails.maxNotionalUsd)}</strong>
              </div>
              <div>
                <span>Allowed markets</span>
                <strong>{defaultGuardrails.allowedMarkets.join(", ")}</strong>
              </div>
              <div>
                <span>Live orders</span>
                <strong>Human approval</strong>
              </div>
            </div>
          </div>

          <div className="panel run-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Autonomy log</p>
                <h2>Agent runs</h2>
              </div>
            </div>
            <div className="run-list">
              {executionLog.map((item, index) => (
                <div key={`${item}-${index}`}>
                  <History size={18} />
                  <span>
                    <strong>{item}</strong>
                    <small>Current session</small>
                  </span>
                  <em>Now</em>
                </div>
              ))}
              {agentRuns.map((run) => (
                <div key={run.title}>
                  <CheckCircle2 size={18} />
                  <span>
                    <strong>{run.title}</strong>
                    <small>{run.detail}</small>
                  </span>
                  <em>{run.status}</em>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
