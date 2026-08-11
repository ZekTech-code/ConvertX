
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fmt(value, decimals = 6) {
  if (value == null || value === "") return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getExchangeRate(tx) {
  return toFiniteNumber(tx?.rate) ?? toFiniteNumber(tx?.exchangeRate);
}

function getAmountSent(tx) {
  return toFiniteNumber(tx?.fromAmount) ?? toFiniteNumber(tx?.amountSent);
}

function getAmountReceived(tx) {
  const storedReceived = toFiniteNumber(tx?.toAmount) ?? toFiniteNumber(tx?.amountReceived);
  if (storedReceived != null) return storedReceived;

  const amountSent = getAmountSent(tx);
  const exchangeRate = getExchangeRate(tx);
  if (amountSent == null || exchangeRate == null) return null;

  return amountSent * exchangeRate;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function exportConversionHistoryAsCsv(rows, user = "Valued Customer") {
  if (!rows || rows.length === 0) return;

  const totalTrades   = rows.length;
  const pairs         = [...new Set(rows.map((r) => `${r.from}/${r.to}`))];
  const totalSent     = rows.reduce((s, r) => s + (getAmountSent(r) || 0), 0);
  const totalReceived = rows.reduce((s, r) => s + (getAmountReceived(r) || 0), 0);
  const firstDate     = fmtDate(rows[rows.length - 1]?.timestamp);
  const lastDate      = fmtDate(rows[0]?.timestamp);
  const generated     = new Date().toLocaleString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const rowsHtml = rows
    .map((tx, i) => {
      const amountSent = getAmountSent(tx);
      const amountReceived = getAmountReceived(tx);
      const exchangeRate = getExchangeRate(tx);

      return `
      <tr class="${i % 2 === 0 ? "row-even" : "row-odd"}">
        <td class="td-center muted">${i + 1}</td>
        <td class="td-mono small">${escapeHtml(tx.id) || "—"}</td>
        <td class="td-date">${escapeHtml(fmtDate(tx.timestamp))}</td>
        <td class="td-center"><span class="badge badge-from">${escapeHtml(tx.from) || "—"}</span></td>
        <td class="td-center"><span class="badge badge-to">${escapeHtml(tx.to) || "—"}</span></td>
        <td class="td-right td-mono">${fmt(amountSent, 4)}</td>
        <td class="td-right td-mono received">${fmt(amountReceived, 4)}</td>
        <td class="td-right td-mono small muted">${fmt(exchangeRate, 8)}</td>
      </tr>`;
    })
    .join("");

  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none"><defs><linearGradient id="cx-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#22d3ee" /><stop offset="100%" stop-color="#3b82f6" /></linearGradient></defs><path d="M 436,416 L 236,96 A 160,160 0 0,0 236,416 L 436,96" stroke="url(#cx-grad)" stroke-width="72" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
  const base64Logo = typeof window !== "undefined" ? window.btoa(logoSvg) : "";
  const faviconUri = `data:image/svg+xml;base64,${base64Logo}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ConvertX — Exchange Statement</title>
  <link rel="icon" type="image/svg+xml" href="${faviconUri}" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 11px;
      color: #1e293b;
      background: #f8fafc;
      padding: 0;
    }

    @page {
      size: A4 landscape;
      margin: 14mm 12mm;
    }

    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .page-wrapper { box-shadow: none; border-radius: 0; }
    }

    .page-wrapper {
      max-width: 1100px;
      margin: 28px auto;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 32px rgba(0,0,0,0.10);
    }

    .header {
      background: linear-gradient(135deg, #0f172a 0%, #0e2340 55%, #0f3460 100%);
      color: #fff;
      padding: 28px 36px 24px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-logo {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #22d3ee, #3b82f6);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 900;
      color: #000;
      letter-spacing: -0.5px;
      flex-shrink: 0;
    }

    .brand-text h1 {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #fff;
    }

    .brand-text p {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 2px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .header-meta {
      text-align: right;
    }

    .header-meta .doc-type {
      font-size: 13px;
      font-weight: 800;
      color: #22d3ee;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .header-meta p {
      font-size: 9.5px;
      color: #94a3b8;
      margin-top: 4px;
      line-height: 1.6;
    }

    .header-meta strong { color: #e2e8f0; }

    .info-bar {
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      padding: 14px 36px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
    }

    .info-cell {
      padding: 0 18px;
      border-right: 1px solid #e2e8f0;
    }
    .info-cell:first-child { padding-left: 0; }
    .info-cell:last-child  { border-right: none; }

    .info-label {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      margin-bottom: 3px;
    }

    .info-value {
      font-size: 11.5px;
      font-weight: 700;
      color: #0f172a;
    }

    .summary-section {
      padding: 20px 36px;
      border-bottom: 1px solid #e2e8f0;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
    }

    .stat-card .stat-label {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      margin-bottom: 5px;
    }

    .stat-card .stat-value {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
      font-variant-numeric: tabular-nums;
    }

    .stat-card.accent { border-color: #22d3ee; background: #ecfeff; }
    .stat-card.accent .stat-value { color: #0891b2; }

    .table-section { padding: 0 36px 28px; }

    .table-heading {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #475569;
      padding: 18px 0 10px;
      border-bottom: 2px solid #0f172a;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .table-heading span.count {
      font-size: 9px;
      background: #0f172a;
      color: #fff;
      border-radius: 4px;
      padding: 2px 7px;
      font-weight: 700;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0;
      font-size: 10.5px;
    }

    thead tr {
      background: #0f172a;
      color: #94a3b8;
    }

    thead th {
      padding: 9px 10px;
      font-weight: 700;
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      white-space: nowrap;
    }

    thead th:first-child { border-radius: 0; }

    .row-even { background: #fff; }
    .row-odd  { background: #f8fafc; }

    td {
      padding: 7px 10px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #334155;
    }

    tr:last-child td { border-bottom: none; }

    .td-center { text-align: center; }
    .td-right  { text-align: right; }
    .td-mono   { font-family: 'Courier New', Courier, monospace; font-weight: 600; }
    .td-date   { white-space: nowrap; color: #475569; }
    .muted     { color: #94a3b8; }
    .small     { font-size: 9px; }
    .received  { color: #059669; font-weight: 700; }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }

    .badge-from { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .badge-to   { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }

    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 16px 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .footer p {
      font-size: 8.5px;
      color: #94a3b8;
      line-height: 1.5;
    }

    .footer strong { color: #64748b; }

    .footer .seal {
      background: linear-gradient(135deg, #22d3ee, #3b82f6);
      color: #fff;
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 5px 12px;
      border-radius: 6px;
      white-space: nowrap;
    }

    .print-bar {
      background: #0f172a;
      padding: 14px 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .print-bar p {
      font-size: 11px;
      color: #94a3b8;
    }

    .btn-print {
      background: linear-gradient(135deg, #22d3ee, #3b82f6);
      color: #000;
      font-weight: 800;
      font-size: 11px;
      border: none;
      border-radius: 8px;
      padding: 10px 24px;
      cursor: pointer;
      letter-spacing: 0.3px;
      transition: opacity 0.15s;
    }

    .btn-print:hover { opacity: 0.9; }
  </style>
</head>
<body>

  <div class="print-bar no-print">
    <p>Your exchange statement is ready — click Print to save as PDF or send to a printer.</p>
    <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="page-wrapper">

    <div class="header">
      <div class="brand">
        <div class="brand-logo">
          <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 26px; height: 26px; display: block;">
            <path d="M 436,416 L 236,96 A 160,160 0 0,0 236,416 L 436,96" stroke="#000000" stroke-width="72" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="brand-text">
          <h1>ConvertX</h1>
          <p>Secure Currency Exchange Platform</p>
        </div>
      </div>
      <div class="header-meta">
        <div class="doc-type">Exchange Statement</div>
        <p>Account Holder: <strong>${escapeHtml(user)}</strong></p>
        <p>Period: <strong>${firstDate}</strong> — <strong>${lastDate}</strong></p>
        <p>Generated: <strong>${generated}</strong></p>
      </div>
    </div>

    <div class="info-bar">
      <div class="info-cell">
        <div class="info-label">Document Type</div>
        <div class="info-value">Conversion Ledger</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Currency Pairs</div>
        <div class="info-value">${escapeHtml(pairs.join(" · ")) || "—"}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Statement Period</div>
        <div class="info-value">${firstDate.split(",")[0]} – ${lastDate.split(",")[0]}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Status</div>
        <div class="info-value" style="color:#059669;">Verified & Logged</div>
      </div>
    </div>

    <div class="summary-section">
      <div class="stat-card accent">
        <div class="stat-label">Total Transactions</div>
        <div class="stat-value">${totalTrades}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Unique Pairs Traded</div>
        <div class="stat-value">${pairs.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Volume Sent</div>
        <div class="stat-value" style="font-size:13px;">${totalSent.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Volume Received</div>
        <div class="stat-value" style="font-size:13px; color:#059669;">${totalReceived.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
      </div>
    </div>

    <div class="table-section">
      <div class="table-heading">
        Transaction History
        <span class="count">${totalTrades} record${totalTrades !== 1 ? "s" : ""}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="text-align:center; width:36px;">#</th>
            <th>Transaction ID</th>
            <th>Date &amp; Time</th>
            <th style="text-align:center;">From</th>
            <th style="text-align:center;">To</th>
            <th style="text-align:right;">Amount Sent</th>
            <th style="text-align:right;">Amount Received</th>
            <th style="text-align:right;">Exchange Rate</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div>
        <p><strong>ConvertX Platform</strong> — Rates sourced via open.er-api.com under 256-bit SSL encryption.</p>
        <p>This statement is for informational purposes only and does not constitute financial advice.</p>
        <p>© ${new Date().getFullYear()} ConvertX. All rights reserved. Generated ${generated}.</p>
      </div>
      <div class="seal">Verified Statement</div>
    </div>

  </div>

</body>
</html>`;

  const triggerDownload = (blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `convertx_statement_${Date.now()}.html`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const fileName = `convertx_statement_${Date.now()}.html`;

  const isMobile = typeof navigator !== "undefined" && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    const file = new File([blob], fileName, { type: "text/html" });

    const doNativeShare = () => {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({
          files: [file],
          title: "ConvertX Statement",
          text: "Your currency conversion statement from ConvertX."
        }).then(() => true).catch(() => false);
      }
      return Promise.resolve(false);
    };

    doNativeShare().then((shared) => {
      if (!shared) {
        triggerDownload(blob);
        const win = window.open("", "_blank");
        if (win) {
          win.document.open();
          win.document.write(html);
          win.document.close();
        }
      }
    });
    return;
  }

  const win = window.open("", "_blank");
  if (!win) {
    triggerDownload(blob);
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
}
