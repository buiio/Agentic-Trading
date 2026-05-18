export const HYPERLIQUID_ENDPOINTS = {
  mainnet: {
    info: "https://api.hyperliquid.xyz/info",
    exchange: "https://api.hyperliquid.xyz/exchange",
    websocket: "wss://api.hyperliquid.xyz/ws",
  },
  testnet: {
    info: "https://api.hyperliquid-testnet.xyz/info",
    exchange: "https://api.hyperliquid-testnet.xyz/exchange",
    websocket: "wss://api.hyperliquid-testnet.xyz/ws",
  },
} as const;

export type TradingMode = "observe" | "paper" | "approval-required";

export type GuardrailSettings = {
  mode: TradingMode;
  maxNotionalUsd: number;
  maxLeverage: number;
  maxDailyLossUsd: number;
  allowedMarkets: string[];
  requireHumanApproval: boolean;
};

export const defaultGuardrails: GuardrailSettings = {
  mode: "paper",
  maxNotionalUsd: 750,
  maxLeverage: 3,
  maxDailyLossUsd: 150,
  allowedMarkets: ["BTC", "ETH", "SOL", "HYPE"],
  requireHumanApproval: true,
};

export type MarketSnapshot = {
  coin: string;
  markPx: number;
  change24h: number;
  funding8h: number;
  openInterestUsd: number;
  liquidity: "Deep" | "Moderate" | "Thin";
  signal: "Momentum" | "Mean reversion" | "Wait" | "Risk-off";
  source?: "live" | "fallback";
};

export const marketSnapshots: MarketSnapshot[] = [
  {
    coin: "BTC",
    markPx: 104820,
    change24h: 1.84,
    funding8h: 0.006,
    openInterestUsd: 1290000000,
    liquidity: "Deep",
    signal: "Momentum",
  },
  {
    coin: "ETH",
    markPx: 3786,
    change24h: -0.42,
    funding8h: 0.002,
    openInterestUsd: 742000000,
    liquidity: "Deep",
    signal: "Mean reversion",
  },
  {
    coin: "SOL",
    markPx: 182.43,
    change24h: 3.28,
    funding8h: 0.018,
    openInterestUsd: 348000000,
    liquidity: "Moderate",
    signal: "Momentum",
  },
  {
    coin: "HYPE",
    markPx: 31.12,
    change24h: -2.16,
    funding8h: -0.004,
    openInterestUsd: 164000000,
    liquidity: "Moderate",
    signal: "Wait",
  },
  {
    coin: "FET",
    markPx: 1.42,
    change24h: 6.44,
    funding8h: 0.031,
    openInterestUsd: 39000000,
    liquidity: "Thin",
    signal: "Risk-off",
  },
];

export const trackedMarkets = ["BTC", "ETH", "SOL", "HYPE", "FET"] as const;

export function deriveMarketSignal(change24h: number, funding8h: number): MarketSnapshot["signal"] {
  if (funding8h > 0.025) {
    return "Risk-off";
  }

  if (change24h > 1) {
    return "Momentum";
  }

  if (change24h < -3) {
    return "Wait";
  }

  return "Mean reversion";
}

export function deriveLiquidity(openInterestUsd: number): MarketSnapshot["liquidity"] {
  if (openInterestUsd > 500_000_000) {
    return "Deep";
  }

  if (openInterestUsd > 100_000_000) {
    return "Moderate";
  }

  return "Thin";
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value > 1000 ? 0 : 2,
  }).format(value);
}

export function formatCompactUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
