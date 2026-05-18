# Asteria Trading Agent

A first product slice for a retail AI trading app focused on Hyperliquid.

The app is intentionally paper-first. The agent can analyze a market, run deterministic risk checks, and stage a paper order, but it does not submit live orders directly. That separation is important for a retail trading product: LLMs should explain and recommend, while policy code, wallet permissions, and human approval control execution.

## What is included

- Next.js app router UI for a trading cockpit.
- Mock Hyperliquid market scanner and autonomy log.
- Agent analysis endpoint at `/api/agent/analyze`.
- Guardrail model for max notional, max leverage, daily loss cap, allowed markets, and approval mode.
- Hyperliquid endpoint constants for mainnet and testnet Info, Exchange, and WebSocket APIs.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Architecture direction

1. Market data service
   Use Hyperliquid WebSocket subscriptions for trades, mids, L2 book, candles, user fills, and account updates. The official docs list `wss://api.hyperliquid.xyz/ws` for mainnet and `wss://api.hyperliquid-testnet.xyz/ws` for testnet.

2. Agent reasoning layer
   Give the model normalized market state, portfolio state, and user intent. Keep prompts read-only. The model returns structured analysis, proposed order intent, and uncertainty.

3. Policy and risk engine
   Validate every proposed action outside the LLM. Enforce market allowlists, max notional, leverage, slippage, daily loss, liquidation distance, cooldowns, and kill switches.

4. Execution adapter
   Use Hyperliquid Exchange API or SDK from a service that owns signing. Start with testnet and API wallets. Keep user keys out of the browser.

5. Audit trail
   Store every prompt, model response, market snapshot, policy decision, user approval, order request, exchange response, and cancel/modify event.

## Product guardrails

- Default to observe or paper mode.
- Require explicit user approval before live orders.
- Never let the LLM hold private keys or sign transactions.
- Separate agent suggestions from deterministic execution policy.
- Display clear liquidation, slippage, funding, and max-loss estimates before submission.
- Treat this as trading software, not financial advice.
