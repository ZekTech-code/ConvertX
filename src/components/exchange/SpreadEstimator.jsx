import { VIVID } from "../../styles/colors";
import { useMemo, useState } from "react";
import { ChevronsRight, Info } from "lucide-react";
import { formatRate } from "../../utils/formatRate";

const SPREAD_SCENARIOS = {
  bank: {
    label: "Bank Scenario",
    spread: 2.5,
  },
  broker: {
    label: "Broker Scenario",
    spread: 0.8,
  },
  exchange: {
    label: "Exchange Scenario",
    spread: 0.15,
  },
  p2p: {
    label: "P2P Scenario",
    spread: 1.2,
  },
  remit: {
    label: "Remittance Scenario",
    spread: 3.8,
  },
  fintech: {
    label: "Fintech Scenario",
    spread: 0.45,
  },
};

const SCENARIO_COLORS = {
  bank: "#f59e0b",
  broker: VIVID[600],
  exchange: "#34d399",
  p2p: "#818cf8",
  remit: "#f43f5e",
  fintech: VIVID[400],
};

function formatMoney(value, currency) {
  if (!Number.isFinite(value)) {
    return `-- ${currency}`;
  }

  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function formatCost(value, currency) {
  if (!Number.isFinite(value)) {
    return `-- ${currency}`;
  }

  return `-${formatMoney(value, currency)}`;
}

export default function SpreadEstimator({ rate, to, amount }) {
  const [selectedScenario, setSelectedScenario] = useState("bank");
  const [showTip, setShowTip] = useState(false);

  const scenario = SPREAD_SCENARIOS[selectedScenario];
  const activeColor = SCENARIO_COLORS[selectedScenario];

  const values = useMemo(() => {
    const numericRate = Number(rate);
    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericRate) ||
      !Number.isFinite(numericAmount) ||
      numericRate <= 0 ||
      numericAmount <= 0
    ) {
      return {
        midMarketTotal: null,
        scenarioRate: null,
        estimatedReceive: null,
        estimatedSpreadCost: null,
      };
    }

    const scenarioRate = numericRate * (1 - scenario.spread / 100);
    const midMarketTotal = numericAmount * numericRate;
    const estimatedReceive = numericAmount * scenarioRate;

    return {
      midMarketTotal,
      scenarioRate,
      estimatedReceive,
      estimatedSpreadCost: midMarketTotal - estimatedReceive,
    };
  }, [amount, rate, scenario.spread]);

  return (
    <div className="bg-surface-muted border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <ChevronsRight size={13} className="text-accent" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary font-sans">
            Spread Scenarios
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowTip((value) => !value)}
          className="text-text-muted hover:text-accent transition cursor-pointer"
          title="What is this?">
          <Info size={12} />
        </button>
      </div>

      {showTip && (
        <p className="text-[10px] text-text-secondary bg-surface-muted rounded-xl px-3 py-2 mb-3 font-sans leading-relaxed border border-border">
          Scenario values estimate how a selected spread changes the live mid-market result.
          They are not live bank, broker, remittance, P2P, exchange, or fintech quotes.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(SPREAD_SCENARIOS).map(([key, item]) => (
          <button
            type="button"
            key={key}
            onClick={() => setSelectedScenario(key)}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer font-sans ${
              selectedScenario === key
                ? "border-accent/40 text-accent"
                : "border-border text-text-secondary hover:border-accent hover:bg-accent-soft"
            }`}
            style={selectedScenario === key ? { background: `${SCENARIO_COLORS[key]}18` } : {}}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-3 inline-flex items-center rounded-full bg-surface-muted px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-text-secondary font-sans">
        Selected spread: {scenario.spread}%
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-text-secondary font-sans">
            Mid-market rate
          </span>
          <span className="font-mono text-[11px] font-bold text-text tabular-nums">
            {Number.isFinite(Number(rate)) ? formatRate(Number(rate)) : "--"}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[10px] text-text-secondary font-sans">
            Scenario rate after {scenario.spread}% spread
          </span>
          <span
            className="font-mono text-[11px] font-bold tabular-nums"
            style={{ color: activeColor }}
          >
            {values.scenarioRate != null ? formatRate(values.scenarioRate) : "--"}
          </span>
        </div>

        <div className="border-t border-border pt-1.5 flex justify-between items-center">
          <span className="text-[10px] text-text-secondary font-sans">
            Mid-market total
          </span>
          <span className="font-mono text-[11px] font-bold text-text tabular-nums">
            {formatMoney(values.midMarketTotal, to)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[10px] text-text-secondary font-sans">
            Estimated receive
          </span>
          <span className="font-mono text-xs font-black text-positive tabular-nums">
            {formatMoney(values.estimatedReceive, to)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[10px] text-text-secondary font-sans">
            Estimated spread cost
          </span>
          <span className="font-mono text-[11px] font-semibold text-negative tabular-nums">
            {formatCost(values.estimatedSpreadCost, to)}
          </span>
        </div>
      </div>
    </div>
  );
}
