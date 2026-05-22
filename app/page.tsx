"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  Flame,
  Radio,
  ShieldCheck,
  TimerReset,
  X,
} from "lucide-react";
import { useState } from "react";

const proofTrades = [
  { date: "May 14", market: "SOL-PERP", hold: "14m", result: "-6.1%" },
  { date: "May 17", market: "ETH-PERP", hold: "12m", result: "-3.8%" },
  { date: "May 19", market: "HYPE-PERP", hold: "19m", result: "-8.0%" },
];

const closedTrade = {
  market: "SOL-PERP",
  side: "Short",
  pnl: "-4.2%",
  entry: "$174.82",
  exit: "$182.16",
  size: "$8,400",
};

export default function Home() {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  return (
    <main className="arlo-shell">
      <section className="platform-frame">
        <aside className="platform-sidebar">
          <div className="arlo-logo">
            <span>Arlo</span>
            <small>behavioral layer</small>
          </div>
          <nav>
            <button className="active">Receipt</button>
            <button>Wallet model</button>
            <button>History</button>
            <button>Silence rules</button>
          </nav>
          <div className="wallet-readout">
            <Radio size={16} />
            <span>0x7a...91F connected</span>
          </div>
        </aside>

        <section className="trade-surface">
          <header className="platform-topbar">
            <div>
              <p className="eyebrow">Hyperliquid crypto-native release</p>
              <h1>Behavioral Receipt</h1>
            </div>
            <div className="state-toggle" aria-label="Receipt state">
              <button className={!expanded ? "selected" : ""} onClick={() => setExpanded(false)}>
                State A
              </button>
              <button className={expanded ? "selected" : ""} onClick={() => setExpanded(true)}>
                State B
              </button>
            </div>
          </header>

          <section className="market-context" aria-label="Simulated Hyperliquid trading context">
            <div className="chart-panel">
              <div className="chart-header">
                <span>SOL-PERP</span>
                <strong>$182.16</strong>
                <em>-4.2% closed</em>
              </div>
              <div className="chart-grid">
                <i style={{ height: "36%" }} />
                <i style={{ height: "52%" }} />
                <i style={{ height: "43%" }} />
                <i style={{ height: "65%" }} />
                <i style={{ height: "58%" }} />
                <i style={{ height: "82%" }} />
                <i style={{ height: "76%" }} />
                <i style={{ height: "91%" }} />
                <i style={{ height: "70%" }} />
                <i style={{ height: "86%" }} />
                <i style={{ height: "62%" }} />
                <i style={{ height: "73%" }} />
              </div>
              <div className="timeline-marker">
                <span>Invalidation window</span>
                <strong>+11m drift</strong>
              </div>
            </div>

            <div className="execution-panel">
              <div>
                <span>Closed position</span>
                <strong>{closedTrade.market}</strong>
              </div>
              <div>
                <span>Side</span>
                <strong>{closedTrade.side}</strong>
              </div>
              <div>
                <span>Position size</span>
                <strong>{closedTrade.size}</strong>
              </div>
              <div>
                <span>Exit result</span>
                <strong className="loss">{closedTrade.pnl}</strong>
              </div>
            </div>
          </section>

          <section className="receipt-zone">
            <div className="silence-note">
              <ShieldCheck size={16} />
              <span>Arlo stays silent during the trade. This receipt appears only after a meaningful behavioral deviation.</span>
            </div>

            {!dismissed ? (
              <article className={`behavioral-receipt ${expanded ? "expanded" : ""}`}>
                <div className="receipt-titlebar">
                  <span>ARLO — Behavioral Alert</span>
                  <button aria-label="Dismiss receipt" onClick={() => setDismissed(true)}>
                    <X size={16} />
                  </button>
                </div>

                <div className="alert-banner">
                  <AlertTriangle size={19} />
                  <strong>Behavioral deviation detected</strong>
                </div>

                <div className="closed-row">
                  <span>
                    Closed: <strong>{closedTrade.market}</strong> <em>({closedTrade.side})</em>
                  </span>
                  <span>
                    PnL: <strong>{closedTrade.pnl}</strong>
                  </span>
                </div>

                <div className="receipt-divider" />

                <section className="receipt-section">
                  <p>The deviation</p>
                  <h2>You held this position 11 minutes past your normal invalidation exit window.</h2>
                </section>

                <section className="impact-row">
                  <div>
                    <ArrowDownRight size={18} />
                    <span>The cost</span>
                    <strong>This habit drops your setup expectancy by -23%.</strong>
                  </div>
                  <div>
                    <TimerReset size={18} />
                    <span>Baseline exit</span>
                    <strong>4m 12s average</strong>
                  </div>
                </section>

                {expanded ? (
                  <section className="historical-proof">
                    <div className="proof-heading">
                      <BarChart3 size={18} />
                      <span>The historical proof</span>
                    </div>
                    <p>
                      On similar momentum setups over the last 30 days, your average exit time was
                      <strong> 4m 12s</strong>. Your execution history records this exact drift here:
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
                  </section>
                ) : null}

                <div className="receipt-actions">
                  <button className="proof-button" onClick={() => setExpanded((current) => !current)}>
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    <span>{expanded ? "Collapse historical proof" : "View the 3 historical trades that prove this"}</span>
                  </button>
                  {expanded ? (
                    <>
                      <button className="secondary-button">
                        <ExternalLink size={17} />
                        <span>Open full history log</span>
                      </button>
                      <button className="dismiss-button" onClick={() => setDismissed(true)}>
                        Dismiss
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            ) : (
              <div className="dismissed-state">
                <Flame size={18} />
                <span>Receipt dismissed. Arlo returns to silence until the next meaningful deviation.</span>
              </div>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}
