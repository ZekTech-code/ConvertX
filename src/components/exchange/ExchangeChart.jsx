import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import { RefreshCw } from "lucide-react";

export default function ExchangeChart({
  data,
  loading,
  pair,
  height = 450,
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data?.length) return;

    const isDark = document.documentElement.classList.contains("dark");

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,

      layout: {
        background: {
          color: isDark ? "transparent" : "transparent",
        },
        textColor: isDark ? "#cbd5e1" : "#334155",
      },

      grid: {
        vertLines: {
          color: isDark
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.05)",
        },
        horzLines: {
          color: isDark
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.05)",
        },
      },

      crosshair: {
        mode: 1,
      },

      rightPriceScale: {
        borderVisible: false,
      },

      timeScale: {
        borderVisible: false,
      },
    });

    const areaSeries = chart.addAreaSeries({
      lineWidth: 3,

      topColor: "rgba(232,143,43,0.35)",

      bottomColor: "rgba(232,143,43,0.02)",

      lineColor: "#E88F2B",
    });

    const formattedData = data.map((item) => ({
      time: item.date,
      value: Number(item.rate),
    }));

    areaSeries.setData(formattedData);

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({
        width:
          chartContainerRef.current.clientWidth,
      });
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    chartRef.current = chart;

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );

      chart.remove();
    };
  }, [data, height]);

  if (loading) {
    return (
      <div className="h-112.5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#E88F2B]" />

          <span className="text-slate-400">
            Loading chart...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold">
            {pair}
          </h3>

          <p className="text-sm text-slate-400">
            Historical Exchange Rate Trend
          </p>
        </div>

        <div className="mt-3 sm:mt-0">
          <span className="px-3 py-1 rounded-full bg-[#E88F2B]/10 text-[#E88F2B] text-xs font-semibold border border-[#E88F2B]/20">
            Live Market Data
          </span>
        </div>
      </div>

      {/* Chart */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/10">
        <div
          ref={chartContainerRef}
          className="w-full"
        />
      </div>
    </div>
  );
}