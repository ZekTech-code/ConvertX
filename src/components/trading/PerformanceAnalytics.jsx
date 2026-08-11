import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Activity, Shield, DollarSign, Award, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

function formatUSD(n) {
  if (!n && n !== 0) return '$0.00';
  const abs = Math.abs(n);
  let s;
  if (abs >= 1e9) s = `$${(n / 1e9).toFixed(2)}B`;
  else if (abs >= 1e6) s = `$${(n / 1e6).toFixed(2)}M`;
  else if (abs >= 1e3) s = `$${(n / 1e3).toFixed(1)}K`;
  else s = `$${n.toFixed(2)}`;
  return n < 0 ? `-${s.replace('-', '')}` : s;
}

export default function PerformanceAnalytics({ trades, initialBalance, darkMode }) {
  const [chartView, setChartView] = useState('equity');

  const tc = (dark, light) => ({ color: darkMode ? dark : light });

  const stats = useMemo(() => {
    const closedTrades = trades.filter((t) => t.side === 'sell' && t.status === 'filled');
    const wins = closedTrades.filter((t) => t.pnl > 0);
    const losses = closedTrades.filter((t) => t.pnl < 0);
    const totalTrades = trades.length;
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    const avgProfit = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0)) / losses.length : 0;
    const totalClosed = closedTrades.reduce((s, t) => s + t.pnl, 0);
    const totalFees = trades.reduce((s, t) => s + (t.fee || 0), 0);
    const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.pnl || 0)) : 0;
    const worstTrade = closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.pnl || 0)) : 0;

    const profitFactor = avgLoss > 0 ? (avgProfit * wins.length) / (avgLoss * losses.length) : wins.length > 0 ? Infinity : 0;

    const returns = trades.filter((t) => t.side === 'sell' && t.status === 'filled' && t.pnl != null).map((t) => t.pnl / Math.abs(t.total || 1));
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 1 ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)) : 0;
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    let peak = initialBalance;
    let maxDrawdown = 0;
    let runningBalance = initialBalance;
    const equityCurve = [{ date: 'Start', value: initialBalance }];
    const sortedTrades = [...trades].filter((t) => t.status === 'filled').sort((a, b) => a.timestamp - b.timestamp);
    for (const t of sortedTrades) {
      if (t.side === 'sell' && t.pnl != null) runningBalance += t.pnl;
      else if (t.side === 'buy' && t.status === 'filled') runningBalance -= t.total || 0;
      equityCurve.push({ date: new Date(t.timestamp).toLocaleDateString(), value: runningBalance });
      if (runningBalance > peak) peak = runningBalance;
      const dd = (peak - runningBalance) / peak * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const monthlyMap = {};
    for (const t of trades) {
      if (t.pnl == null) continue;
      const month = new Date(t.timestamp).toLocaleDateString('en', { year: 'numeric', month: 'short' });
      monthlyMap[month] = (monthlyMap[month] || 0) + (t.pnl || 0);
    }
    const monthlyReturns = Object.entries(monthlyMap).map(([month, pnl]) => ({ month, pnl }));

    return {
      winRate, avgProfit, avgLoss, sharpeRatio: sharpeRatio || 0,
      maxDrawdown: maxDrawdown || 0, profitFactor: profitFactor || 0,
      totalTrades, totalClosed, totalFees, bestTrade, worstTrade,
      wins: wins.length, losses: losses.length,
      equityCurve, monthlyReturns,
    };
  }, [trades, initialBalance]);

  const metrics = [
    { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 50 ? '#22c55e' : '#ef4444', icon: Award },
    { label: 'Loss Rate', value: `${(100 - stats.winRate).toFixed(1)}%`, color: stats.winRate < 50 ? '#22c55e' : '#ef4444', icon: TrendingDown },
    { label: 'Avg Profit', value: formatUSD(stats.avgProfit), color: '#22c55e', icon: TrendingUp },
    { label: 'Avg Loss', value: formatUSD(stats.avgLoss), color: '#ef4444', icon: TrendingDown },
    { label: 'Sharpe Ratio', value: stats.sharpeRatio.toFixed(2), color: stats.sharpeRatio >= 1 ? '#22c55e' : '#f59e0b', icon: Shield },
    { label: 'Max Drawdown', value: `${stats.maxDrawdown.toFixed(1)}%`, color: stats.maxDrawdown < 20 ? '#22c55e' : '#ef4444', icon: Activity },
    { label: 'Profit Factor', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), color: stats.profitFactor >= 1.5 ? '#22c55e' : '#f59e0b', icon: DollarSign },
    { label: 'Total Trades', value: stats.totalTrades, color: tc('#94a3b8', '#475569').color, icon: BarChart3 },
    { label: 'Total P&L', value: formatUSD(stats.totalClosed), color: stats.totalClosed >= 0 ? '#22c55e' : '#ef4444', icon: Zap },
    { label: 'Best Trade', value: formatUSD(stats.bestTrade), color: '#22c55e', icon: TrendingUp },
    { label: 'Worst Trade', value: formatUSD(stats.worstTrade), color: '#ef4444', icon: TrendingDown },
    { label: 'Total Fees', value: formatUSD(stats.totalFees), color: '#E88F2B', icon: Activity },
  ];

  return (
    <div className="rounded-2xl flex flex-col gap-3 p-4"
      style={{
        background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
        border: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(148,163,184,0.12)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 size={18} className="text-[#E88F2B]" />
        <span className="text-lg font-black uppercase tracking-wider" style={tc('#94a3b8', '#475569')}>
          Performance Analytics
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg p-2 text-center"
            style={{ background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)' }}
          >
            <m.icon size={10} className="mx-auto mb-0.5" style={{ color: m.color }} />
            <span className="text-[7px] font-bold block" style={tc('#64748b', '#475569')}>{m.label}</span>
            <span className="text-[10px] font-mono font-black" style={{ color: m.color }}>{m.value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {['equity', 'monthly'].map((v) => (
          <button key={v} onClick={() => setChartView(v)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
            style={{
              background: chartView === v ? 'linear-gradient(135deg, #E88F2B, #d97706)' : 'transparent',
              color: chartView === v ? '#000' : tc('#64748b', '#475569').color,
            }}
          >{v}</button>
        ))}
      </div>

      <div className="rounded-xl p-2" style={{ height: 200, background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(15,23,42,0.02)' }}>
        {chartView === 'equity' && stats.equityCurve.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.equityCurve}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E88F2B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E88F2B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: darkMode ? '#64748b' : '#94a3b8' }} />
              <YAxis tick={{ fontSize: 8, fill: darkMode ? '#64748b' : '#94a3b8' }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: darkMode ? '#1a1a1a' : '#fff', border: 'none', borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="value" stroke="#E88F2B" fill="url(#equityGrad)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        ) : chartView === 'monthly' && stats.monthlyReturns.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthlyReturns}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
              <XAxis dataKey="month" tick={{ fontSize: 8, fill: darkMode ? '#64748b' : '#94a3b8' }} />
              <YAxis tick={{ fontSize: 8, fill: darkMode ? '#64748b' : '#94a3b8' }} />
              <Tooltip contentStyle={{ background: darkMode ? '#1a1a1a' : '#fff', border: 'none', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="pnl" fill="#E88F2B" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <span className="text-[11px]" style={tc('#64748b', '#475569')}>Trade more to see performance data</span>
          </div>
        )}
      </div>

      {stats.monthlyReturns.length > 0 && (
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase block" style={tc('#64748b', '#475569')}>Monthly Returns</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {stats.monthlyReturns.slice(-12).map((m) => (
              <div key={m.month} className="rounded-lg px-2 py-1.5 flex items-center justify-between"
                style={{ background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)' }}
              >
                <span className="text-[9px] font-bold" style={tc('#64748b', '#475569')}>{m.month}</span>
                <span className="text-[9px] font-mono font-black" style={{ color: m.pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                  {m.pnl >= 0 ? '+' : ''}{m.pnl.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
