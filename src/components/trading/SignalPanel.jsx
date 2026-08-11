import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, Target, Clock } from 'lucide-react';
import { generateSignals, aggregateSignal, calculateTakeProfits } from '../../services/technicalAnalysis';

export default function SignalPanel({ currentPrice, priceHistory, darkMode }) {
  const [generatedAt] = useState(() => Date.now());

  const analysis = useMemo(() => {
    if (!priceHistory || priceHistory.length < 20 || !currentPrice) {
      return { signals: [], overall: 'NEUTRAL', strength: 0, confidence: 0, summary: 'Waiting for sufficient data...', rsi: null };
    }

    const closes = priceHistory.map((c) => c.close || c.value || 0).filter((v) => v > 0);
    if (closes.length < 20) {
      return { signals: [], overall: 'NEUTRAL', strength: 0, confidence: 0, summary: 'Not enough data points', rsi: null };
    }

    const candles = priceHistory.filter((c) => c.high && c.low && c.close).slice(0, 100);

    const sigs = generateSignals(closes, candles);
    const agg = aggregateSignal(sigs);

    const tps = calculateTakeProfits(currentPrice, agg.type === 'SELL' || agg.type === 'STRONG SELL' ? 'short' : 'long');
    const stopLoss = agg.type === 'SELL' || agg.type === 'STRONG SELL'
      ? currentPrice * 1.02
      : currentPrice * 0.98;

    const trend = agg.type === 'BUY' || agg.type === 'STRONG BUY' ? 'BULLISH'
      : agg.type === 'SELL' || agg.type === 'STRONG SELL' ? 'BEARISH'
      : 'NEUTRAL';

    return {
      signals: sigs,
      overall: agg.type,
      strength: agg.strength,
      confidence: agg.confidence,
      summary: `${agg.type} — ${sigs.length} indicators`,
      rsi: (() => {
        if (closes.length < 15) return 50;
        let gains = 0, losses = 0;
        for (let i = closes.length - 14; i < closes.length; i++) {
          const diff = closes[i] - closes[i - 1];
          if (diff > 0) gains += diff; else losses -= diff;
        }
        return losses === 0 ? 100 : 100 - 100 / (1 + (gains / 14) / (losses / 14));
      })(),
      entryPrice: currentPrice,
      stopLoss,
      takeProfits: tps,
      trend,
      generatedAt,
      expiresAt: generatedAt + 3600000,
      riskReward: tps.length > 0 ? (tps[0].price - currentPrice) / (currentPrice - stopLoss) : 0,
    };
  }, [currentPrice, priceHistory, generatedAt]);

  const tc = (dark, light) => ({ color: darkMode ? dark : light });

  const colors = {
    'STRONG BUY': { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', text: '#22c55e', icon: TrendingUp },
    BUY: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', text: '#22c55e', icon: TrendingUp },
    'STRONG SELL': { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#ef4444', icon: TrendingDown },
    SELL: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', text: '#ef4444', icon: TrendingDown },
    HOLD: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b', icon: Minus },
    NEUTRAL: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b', icon: Minus },
  };

  const overallStyle = colors[analysis.overall] || colors.NEUTRAL;
  const OverallIcon = overallStyle.icon;

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
        border: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(148,163,184,0.12)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Shield size={18} className="text-[#E88F2B]" />
        <span className="text-lg font-black uppercase tracking-wider" style={tc('#94a3b8', '#475569')}>Trading Signals</span>
      </div>

      <div className="rounded-xl p-4 text-center" style={{ background: overallStyle.bg, border: `1px solid ${overallStyle.border}` }}>
        <OverallIcon size={28} className="mx-auto mb-1" style={{ color: overallStyle.text }} />
        <div className="text-xl font-black" style={{ color: overallStyle.text }}>
          {analysis.overall}
          {analysis.strength >= 75 && (analysis.overall === 'BUY' || analysis.overall === 'SELL') && (
            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: overallStyle.bg, color: overallStyle.text, border: `1px solid ${overallStyle.border}` }}
            >{(analysis.overall === 'BUY' ? 'STRONG ' : 'STRONG ') + analysis.overall}</span>
          )}
        </div>
        {analysis.summary && (
          <p className="text-[11px] mt-1" style={tc('#94a3b8', '#475569')}>{analysis.summary}</p>
        )}
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${analysis.strength}%`, background: overallStyle.text }} />
        </div>
        <p className="text-[11px] mt-1 font-bold" style={tc('#64748b', '#475569')}>Confidence: {analysis.confidence}%</p>
      </div>

      {analysis.overall !== 'NEUTRAL' && (
        <div className="rounded-xl p-3 space-y-1.5"
          style={{
            background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
            border: darkMode ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(148,163,184,0.08)',
          }}
        >
          <div className="flex justify-between text-[11px]">
            <span style={tc('#64748b', '#475569')}>Entry</span>
            <span className="font-mono font-bold" style={tc('#e2e8f0', '#1e293b')}>${analysis.entryPrice?.toFixed(4)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span style={tc('#64748b', '#475569')}>Stop Loss</span>
            <span className="font-mono font-bold" style={{ color: '#ef4444' }}>${analysis.stopLoss?.toFixed(4)}</span>
          </div>
          {analysis.takeProfits.map((tp, i) => (
            <div key={i} className="flex justify-between text-[11px]">
              <span style={tc('#64748b', '#475569')}>TP {tp.level} (RR {tp.rrr}:1)</span>
              <span className="font-mono font-bold" style={{ color: '#22c55e' }}>${tp.price.toFixed(4)}</span>
            </div>
          ))}
          <div className="flex justify-between text-[11px] pt-1"
            style={{ borderTop: darkMode ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(148,163,184,0.08)' }}
          >
            <span className="font-bold" style={tc('#94a3b8', '#475569')}>Risk/Reward</span>
            <span className={`font-mono font-bold ${analysis.riskReward >= 2 ? 'text-green-400' : 'text-amber-400'}`}>
              1:{Math.abs(analysis.riskReward).toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span style={tc('#64748b', '#475569')}>Trend</span>
            <span className="font-bold" style={{ color: analysis.trend === 'BULLISH' ? '#22c55e' : analysis.trend === 'BEARISH' ? '#ef4444' : '#f59e0b' }}>
              {analysis.trend}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px]" style={tc('#64748b', '#475569')}>
            <Clock size={9} />
            <span>Generated: {new Date(analysis.generatedAt).toLocaleTimeString()}</span>
            <span>Expires: {new Date(analysis.expiresAt).toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {analysis.rsi != null && (
        <div className="rounded-xl p-2.5 flex items-center justify-between"
          style={{
            background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
            border: darkMode ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(148,163,184,0.08)',
          }}
        >
          <span className="text-[11px] font-bold" style={tc('#64748b', '#475569')}>RSI (14)</span>
          <span className="text-[11px] font-mono font-black"
            style={{ color: analysis.rsi > 70 ? '#ef4444' : analysis.rsi < 30 ? '#22c55e' : '#f59e0b' }}
          >{analysis.rsi.toFixed(1)}</span>
        </div>
      )}

      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {analysis.signals.length === 0 && (
          <div className="text-center py-3">
            <p className="text-[11px]" style={tc('#64748b', '#475569')}>No signals generated yet</p>
          </div>
        )}
        {analysis.signals.map((sig, i) => {
          const sigColors = colors[sig.type] || colors.HOLD;
          return (
            <div key={`${sig.source}-${i}`}
              className="rounded-lg px-2.5 py-1.5 flex items-start gap-1.5"
              style={{ background: sigColors.bg, border: `1px solid ${sigColors.border}` }}
            >
              <Target size={9} className="mt-0.5 shrink-0" style={{ color: sigColors.text }} />
              <div className="min-w-0">
                <span className="text-[11px] font-black" style={{ color: sigColors.text }}>{sig.source}</span>
                <p className="text-[10px]" style={tc('#94a3b8', '#475569')}>{sig.message}</p>
                <span className="text-[8px] font-bold" style={tc('#64748b', '#475569')}>Strength: {sig.strength}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#E88F2B]/5 border border-[#E88F2B]/10">
        <AlertTriangle size={9} className="text-[#E88F2B] shrink-0" />
        <span className="text-[10px]" style={tc('#64748b', '#475569')}>Not financial advice. Always DYOR.</span>
      </div>
    </div>
  );
}
