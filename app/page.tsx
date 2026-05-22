"use client";

import {
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  Radio,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";

const proofTrades = [
  { date: "May 14", market: "SOL-PERP", hold: "14m", result: "-6.1%" },
  { date: "May 17", market: "ETH-PERP", hold: "12m", result: "-3.8%" },
  { date: "May 19", market: "HYPE-PERP", hold: "19m", result: "-8.0%" },
];

const orderBook = [
  ["182.41", "4.21K", "sell"],
  ["182.38", "9.84K", "sell"],
  ["182.34", "2.13K", "sell"],
  ["182.29", "7.65K", "sell"],
  ["182.16", "MARK", "mark"],
  ["182.12", "5.40K", "buy"],
  ["182.08", "8.17K", "buy"],
  ["182.02", "3.92K", "buy"],
  ["181.96", "10.2K", "buy"],
];

export default function Home() {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);

  return (
    <main className="hyper-shell">
      <section className="hyper-app" aria-label="Hyperliquid-style trading app background">
        <header className="hyper-topbar">
          <div className="hyper-brand">
            <span>Hyperliquid</span>
            <em>Perps</em>
          </div>
          <nav>
            <button className="active">Trade</button>
            <button>Vaults</button>
            <button>Portfolio</button>
            <button>History</button>
          </nav>
          <div className="wallet-pill">
            <Radio size={15} />
            <span>0x7a...91F</span>
          </div>
        </header>

        <section className="trading-layout">
          <aside className="markets-rail">
            {["BTC", "ETH", "SOL", "HYPE", "FET", "PURR"].map((coin) => (
              <button className={coin === "SOL" ? "selected" : ""} key={coin}>
                <span>{coin}-PERP</span>
                <strong className={coin === "SOL" ? "negative" : "positive"}>
                  {coin === "SOL" ? "-4.2%" : "+1.8%"}
                </strong>
              </button>
            ))}
          </aside>

          <section className="chart-pane">
            <div className="chart-heading">
              <div>
                <p>SOL-PERP</p>
                <h1>$182.16</h1>
              </div>
              <div className="trade-closed-chip">
                <Clock3 size={15} />
                <span>Short closed 00:00 ago</span>
              </div>
            </div>
            <div className="candles">
              {[36, 52, 43, 65, 58, 82, 76, 91, 70, 86, 62, 73, 57, 68, 49, 61].map(
                (height, index) => (
                  <i
                    className={index > 5 && index < 10 ? "sell-candle" : ""}
                    key={`${height}-${index}`}
                    style={{ height: `${height}%` }}
                  />
                ),
              )}
            </div>
            <div className="invalidation-line">
              <span>Normal invalidation exit</span>
              <strong>missed by 11m</strong>
            </div>
          </section>

          <aside className="book-pane">
            <div className="panel-heading">
              <span>Order book</span>
              <em>0.01</em>
            </div>
            <div className="book-list">
              {orderBook.map(([price, size, side]) => (
                <div className={side} key={`${price}-${size}`}>
                  <span>{price}</span>
                  <strong>{size}</strong>
                </div>
              ))}
            </div>
          </aside>

          <section className="positions-pane">
            <div className="panel-heading">
              <span>Positions</span>
              <button onClick={() => setVisible(true)}>
                <RotateCcw size={14} />
                Replay close
              </button>
            </div>
            <div className="positions-table">
              <div className="table-head">
                <span>Market</span>
                <span>Side</span>
                <span>Size</span>
                <span>Entry</span>
                <span>Exit</span>
                <span>PnL</span>
              </div>
              <div className="closed-position">
                <span>SOL-PERP</span>
                <span>Short</span>
                <span>$8,400</span>
                <span>$174.82</span>
                <span>$182.16</span>
                <strong>-4.2%</strong>
              </div>
            </div>
          </section>
        </section>

        {visible ? (
          <aside className={`receipt-notification ${expanded ? "expanded" : ""}`}>
            <div className="notification-top">
              <div>
                <span className="source-label">
                  <Bell size={14} />
                  ARLO Behavioral Alert
                </span>
                <strong>Behavioral deviation detected</strong>
              </div>
              <button aria-label="Dismiss Arlo notification" onClick={() => setVisible(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="closed-summary">
              <span>
                Closed: <strong>SOL-PERP</strong> <em>Short</em>
              </span>
              <b>-4.2%</b>
            </div>

            <div className="receipt-body">
              <div className="warning-line">
                <AlertTriangle size={18} />
                <span>You held this position 11 minutes past your normal invalidation exit window.</span>
              </div>
              <div className="cost-box">
                <span>The cost</span>
                <strong>This habit drops your setup expectancy by -23%.</strong>
              </div>
            </div>

            {expanded ? (
              <div className="proof-area">
                <div className="proof-title">
                  <BarChart3 size={17} />
                  <span>The historical proof</span>
                </div>
                <p>
                  On similar momentum setups over the last 30 days, your average exit time was
                  <strong> 4m 12s</strong>.
                </p>
                <div className="proof-table">
                  {proofTrades.map((trade) => (
                    <div key={`${trade.date}-${trade.market}`}>
                      <span>{trade.date}</span>
                      <strong>{trade.market}</strong>
                      <em>Hold: {trade.hold}</em>
                      <b>{trade.result}</b>
                    </div>
                  ))}
                </div>
                <div className="confidence-row">
                  <span>Confidence Profile</span>
                  <strong>High</strong>
                </div>
              </div>
            ) : null}

            <div className="notification-actions">
              <button className="primary-action" onClick={() => setExpanded((current) => !current)}>
                {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                <span>{expanded ? "Collapse proof" : "View the 3 historical trades"}</span>
              </button>
              {expanded ? (
                <button className="secondary-action">
                  <ExternalLink size={16} />
                  <span>Full log</span>
                </button>
              ) : null}
            </div>
          </aside>
        ) : (
          <button className="silent-pill" onClick={() => setVisible(true)}>
            <ShieldCheck size={15} />
            Arlo silent until next deviation
          </button>
        )}
      </section>
    </main>
  );
}
