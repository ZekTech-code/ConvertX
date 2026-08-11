import { useMemo, useState } from "react";
import { History, ArrowUpRight, ArrowDownRight, Download } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { getCoinIcon } from "../../utils/coinIcons";

export default function TradeHistory({ trades, darkMode }) {
  const [filter, setFilter] = useState("all");

  const tc = (dark, light) => ({ color: darkMode ? dark : light });

  const filteredTrades = useMemo(() => {
    if (filter === "all") return trades.slice(0, 50);
    return trades.filter((t) => t.side === filter).slice(0, 50);
  }, [trades, filter]);

  const stats = useMemo(() => {
    const sells = trades.filter((t) => t.side === "sell" && t.status === "filled");
    const wins = sells.filter((t) => t.pnl != null && t.pnl > 0);
    const losses = sells.filter((t) => t.pnl != null && t.pnl < 0);
    const totalPnl = sells.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = sells.length > 0 ? (wins.length / sells.length) * 100 : 0;
    return { totalTrades: trades.length, sells: sells.length, wins: wins.length, losses: losses.length, totalPnl, winRate };
  }, [trades]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const formatPrice = (p) => {
    if (!p && p !== 0) return "---";
    if (Math.abs(p) > 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (Math.abs(p) > 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const orange = [232, 143, 43];
    const dark = [15, 23, 42];
    const gray = [100, 116, 139];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...dark);
    doc.text("Trade History Report", 14, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    const now = new Date();
    doc.text(`Generated: ${now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}  ${now.toLocaleTimeString("en-US")}`, 14, 25);

    doc.setDrawColor(...orange);
    doc.setLineWidth(0.8);
    doc.line(14, 29, pageWidth - 14, 29);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text("Summary", 14, 38);

    const sells = trades.filter((t) => t.side === "sell" && t.status === "filled");
    const wins = sells.filter((t) => t.pnl != null && t.pnl > 0);
    const totalPnl = sells.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalFees = trades.reduce((sum, t) => sum + (t.fee || 0), 0);
    const totalVolume = trades.reduce((sum, t) => sum + t.total, 0);
    const winRate = sells.length > 0 ? ((wins.length / sells.length) * 100).toFixed(1) : "0.0";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...gray);
    const summaryData = [
      ["Total Trades", String(trades.length)],
      ["Buy Orders", String(trades.filter((t) => t.side === "buy").length)],
      ["Sell Orders", String(sells.length)],
      ["Win Rate", `${winRate}%`],
      ["Total P&L", `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`],
      ["Total Fees", `$${totalFees.toFixed(4)}`],
      ["Total Volume", `$${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ];

    let yPos = 44;
    summaryData.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...gray);
      doc.text(label, 14, yPos);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...dark);
      doc.text(value, 55, yPos);
      yPos += 6;
    });

    doc.setDrawColor(...orange);
    doc.setLineWidth(0.4);
    doc.line(14, yPos + 2, pageWidth - 14, yPos + 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text("Trade Details", 14, yPos + 10);

    const tableBody = trades.map((t) => {
      const d = new Date(t.timestamp);
      return [
        d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        t.side.toUpperCase(),
        t.assetName || "",
        t.assetSymbol || "",
        t.quantity.toFixed(t.quantity > 1 ? 4 : 8),
        `$${formatPrice(t.price)}`,
        `$${t.total.toFixed(2)}`,
        `$${(t.fee || 0).toFixed(4)}`,
        t.pnl != null ? `${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(2)}` : "---",
        t.status.toUpperCase(),
      ];
    });

    doc.autoTable({
      startY: yPos + 14,
      head: [["Date", "Time", "Side", "Asset", "Symbol", "Quantity", "Price", "Total", "Fee", "P&L", "Status"]],
      body: tableBody,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "ellipsize",
        font: "helvetica",
        textColor: dark,
      },
      headStyles: {
        fillColor: dark,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { halign: "center", cellWidth: 18 },
        3: { cellWidth: 32 },
        4: { halign: "center", cellWidth: 20 },
        5: { halign: "right", cellWidth: 30, font: "courier" },
        6: { halign: "right", cellWidth: 28, font: "courier" },
        7: { halign: "right", cellWidth: 28, font: "courier" },
        8: { halign: "right", cellWidth: 22, font: "courier" },
        9: { halign: "right", cellWidth: 28, font: "courier" },
        10: { halign: "center", cellWidth: 18 },
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          const col = data.column.index;
          if (col === 2) {
            data.cell.styles.textColor = data.cell.raw === "BUY" ? [34, 197, 94] : [239, 68, 68];
            data.cell.styles.fontStyle = "bold";
          }
          if (col === 9 && data.cell.raw !== "---") {
            const isPositive = data.cell.raw.startsWith("+") || (!data.cell.raw.startsWith("-") && data.cell.raw !== "---");
            data.cell.styles.textColor = isPositive ? [34, 197, 94] : [239, 68, 68];
          }
          if (col === 10) {
            data.cell.styles.textColor = data.cell.raw === "FILLED" ? [34, 197, 94] : [245, 158, 11];
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      doc.setFont("helvetica", "normal");
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: "right" });
      doc.text("ConvertX Trading Report", 14, doc.internal.pageSize.getHeight() - 8);
      doc.setDrawColor(...orange);
      doc.setLineWidth(0.3);
      doc.line(14, doc.internal.pageSize.getHeight() - 12, pageWidth - 14, doc.internal.pageSize.getHeight() - 12);
    }

    doc.save(`trade-history-${now.toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
        border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(148,163,184,0.12)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <History size={18} className="text-[#E88F2B]" />
          <span className="text-lg font-black uppercase tracking-wider" style={tc("#94a3b8", "#475569")}>
            Trade History
          </span>
        </div>
        {trades.length > 0 && (
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer"
            style={{
              background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
              border: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.1)",
              color: "#E88F2B",
            }}
          >
            <Download size={10} />
            PDF
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Closed", value: stats.sells, color: darkMode ? "#94a3b8" : "#475569" },
          { label: "Wins", value: stats.wins, color: "#22c55e" },
          { label: "Losses", value: stats.losses, color: "#ef4444" },
          { label: "Win Rate", value: `${stats.winRate.toFixed(0)}%`, color: stats.winRate >= 50 ? "#22c55e" : "#ef4444" },
          { label: "Total P&L", value: `${stats.totalPnl >= 0 ? "+" : ""}$${stats.totalPnl.toFixed(0)}`, color: stats.totalPnl >= 0 ? "#22c55e" : "#ef4444" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg p-3 text-center"
            style={{
              background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
              border: darkMode ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(148,163,184,0.08)",
            }}
          >
            <span className="text-[12px] font-bold block" style={tc("#64748b", "#475569")}>{s.label}</span>
            <span className="text-sm font-mono font-black" style={{ color: s.color }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-center" style={tc("#475569", "#64748b")}>
        Based on {stats.sells} closed position{stats.sells !== 1 ? "s" : ""} (PnL from sell trades)
      </div>

      <div className="flex gap-2">
        {["all", "buy", "sell"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="flex-1 py-2 rounded-lg text-[14px] font-bold uppercase tracking-wider transition-all cursor-pointer"
            style={{
              background: filter === f ? "rgba(232,143,43,0.12)" : "transparent",
              border: filter === f ? "1px solid rgba(232,143,43,0.25)" : darkMode ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(148,163,184,0.08)",
              color: filter === f ? "#E88F2B" : darkMode ? "#64748b" : "#475569",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
        {filteredTrades.length === 0 && (
          <div className="text-center py-6">
            <p className="text-[15px]" style={tc("#64748b", "#475569")}>No trades yet</p>
            <p className="text-[14px]" style={tc("#475569", "#64748b")}>Your trade history will appear here</p>
          </div>
        )}

        {filteredTrades.map((trade) => {
          const coinId = trade.assetId || trade.assetSymbol?.toLowerCase();
          return (
            <div
              key={trade.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-all"
              style={{
                background: darkMode ? "rgba(255,255,255,0.01)" : "rgba(15,23,42,0.01)",
                border: darkMode ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(148,163,184,0.06)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <img src={getCoinIcon(coinId)} alt="" width={34} height={34} className="rounded-full object-cover" style={{width: 34, height: 34}} />
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                    style={{
                      background: trade.side === "buy" ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)",
                    }}
                  >
                    {trade.side === "buy" ? (
                      <ArrowUpRight size={7} className="text-white" />
                    ) : (
                      <ArrowDownRight size={7} className="text-white" />
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[15px] font-black" style={tc("#e2e8f0", "#1e293b")}>
                    {trade.side.toUpperCase()} {trade.assetSymbol}
                  </span>
                  <div className="text-[13px]" style={tc("#64748b", "#475569")}>
                    {trade.quantity.toFixed(trade.quantity > 1 ? 4 : 8)} @ ${formatPrice(trade.price)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[15px] font-mono font-bold" style={tc("#cbd5e1", "#334155")}>${trade.total.toFixed(2)}</span>
                {trade.pnl != null && (
                  <div
                    className="text-[14px] font-bold"
                    style={{ color: trade.pnl >= 0 ? "#22c55e" : "#ef4444" }}
                  >
                    {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                  </div>
                )}
                <div className="text-[12px]" style={tc("#475569", "#64748b")}>
                  {formatDate(trade.timestamp)} {formatTime(trade.timestamp)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
