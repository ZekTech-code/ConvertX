import { useEffect, useState } from "react";
import { CheckCircle, X, TrendingUp, TrendingDown } from "lucide-react";
import { getCoinIcon } from "../../utils/coinIcons";
import { BORDER, pick, POSITIVE, SURFACE, SURFACE_MUTED, SURFACE_SUNKEN, TEXT, TEXT_MUTED } from "../../styles/colors";

export default function AlertToast({ alert, onDismiss, darkMode }) {
  const [progress, setProgress] = useState(100);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!alert) return;

    const duration = 6000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    const exitTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 400);
    }, duration);

    return () => {
      clearInterval(timer);
      clearTimeout(exitTimer);
    };
  }, [alert, onDismiss]);

  if (!alert) return null;

  const formatPrice = (p) => {
    if (!p) return "---";
    if (p > 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p > 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  return (
    <div
      className="fixed top-4 left-1/2 z-9999 w-full max-w-md px-4 pointer-events-none"
      style={{
        transform: "translateX(-50%)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
        opacity: exiting ? 0 : 1,
      }}
    >
      <div
        className="rounded-2xl overflow-hidden pointer-events-auto"
        style={{
          background: pick(SURFACE, darkMode),
          border: "1px solid rgba(34,197,94,0.25)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(34,197,94,0.1)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="p-4 flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <CheckCircle size={24} className="text-positive" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <img
                src={getCoinIcon(alert.assetId)}
                alt=""
                width={20}
                height={20}
                className="rounded-full shrink-0"
              />
              <span className="text-[15px] font-black" style={{ color: TEXT[darkMode] }}>
                {alert.assetSymbol}
              </span>
              <span className="text-[12px] font-bold px-1.5 py-0.5 rounded-md bg-green-500/15 text-green-400">
                TRIGGERED
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {alert.condition === "above" ? (
                <TrendingUp size={13} className="text-positive" />
              ) : (
                <TrendingDown size={13} className="text-negative" />
              )}
              <span className="text-[14px] font-bold" style={{ color: TEXT_MUTED[darkMode] }}>
                Price hit ${formatPrice(alert.targetPrice)}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setExiting(true);
              setTimeout(onDismiss, 400);
            }}
            className="p-2 rounded-xl transition-all cursor-pointer shrink-0"
            style={{
              background: pick(SURFACE_MUTED, darkMode),
              border: "1px solid " + pick(BORDER, darkMode),
            }}
          >
            <X size={16} style={{ color: TEXT_MUTED[darkMode] }} />
          </button>
        </div>

        <div className="h-0.75 w-full" style={{ background: pick(SURFACE_SUNKEN, darkMode) }}>
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              background: pick(POSITIVE, darkMode),
            }}
          />
        </div>
      </div>
    </div>
  );
}
