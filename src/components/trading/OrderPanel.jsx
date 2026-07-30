import { useState, useMemo } from 'react';
import { ArrowUpRight, TrendingDown, Zap, AlertTriangle, Calculator } from 'lucide-react';

const ORDER_TYPES = ['market', 'limit', 'stop', 'stop_limit', 'take_profit', 'stop_loss'];

export default function OrderPanel({ asset, currentPrice, darkMode, balance, onExecuteOrder }) {
  const [side, setSide] = useState('buy');
  const [orderType, setOrderType] = useState('market');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const tc = (dark, light) => ({ color: darkMode ? dark : light });

  const parsed = useMemo(() => ({
    amount: Math.max(0, parseFloat(amount) || 0),
    limitPrice: parseFloat(limitPrice) || null,
    stopPrice: parseFloat(stopPrice) || null,
    tp: parseFloat(takeProfit) || null,
    sl: parseFloat(stopLoss) || null,
    lev: Math.max(1, Math.min(125, parseInt(leverage) || 1)),
  }), [amount, limitPrice, stopPrice, takeProfit, stopLoss, leverage]);

  const execPrice = useMemo(() => {
    if (orderType === 'limit' && parsed.limitPrice) return parsed.limitPrice;
    if (orderType === 'stop_limit' && parsed.limitPrice) return parsed.limitPrice;
    if (orderType === 'stop' && parsed.stopPrice) return parsed.stopPrice;
    return currentPrice || 0;
  }, [orderType, parsed, currentPrice]);

  const estimatedQty = useMemo(() => {
    if (!execPrice || parsed.amount <= 0) return 0;
    return parsed.amount / execPrice;
  }, [parsed.amount, execPrice]);

  const fee = parsed.amount * 0.001;
  const totalWithFee = parsed.amount + fee;
  const marginRequired = parsed.lev > 1 ? parsed.amount / parsed.lev : parsed.amount;
  const liquidationPrice = useMemo(() => {
    if (parsed.lev <= 1 || !currentPrice) return null;
    const liqThreshold = 1 - (1 / parsed.lev) + 0.005;
    return side === 'buy' ? currentPrice * liqThreshold : currentPrice * (2 - liqThreshold);
  }, [parsed.lev, currentPrice, side]);

  const handleSubmit = async () => {
    setError(null);
    setResult(null);
    if (!asset || !currentPrice) { setError('Select an asset.'); return; }
    if (parsed.amount <= 0) { setError('Enter a valid amount.'); return; }

    const required = parsed.lev > 1 ? marginRequired : totalWithFee;
    if (side === 'buy' && required > balance) {
      setError(`Insufficient balance. Need $${required.toFixed(2)}${parsed.lev > 1 ? ` (margin: $${marginRequired.toFixed(2)})` : ''}.`);
      return;
    }

    setLoading(true);
    try {
      const orderPayload = {
        assetId: asset.id,
        assetSymbol: asset.symbol,
        assetName: asset.name,
        type: side,
        amount: parsed.amount,
        orderType,
        limitPrice: ['limit', 'stop_limit'].includes(orderType) ? parsed.limitPrice : null,
        stopPrice: ['stop', 'stop_limit'].includes(orderType) ? parsed.stopPrice : null,
        takeProfit: parsed.tp,
        stopLoss: parsed.sl,
        leverage: parsed.lev,
      };

      const res = onExecuteOrder(orderPayload);
      setResult({
        side, quantity: res.quantity, price: res.price,
        total: parsed.amount, pnl: res.pnl, fee: res.fee || fee,
        pending: res.pending, leverage: parsed.lev,
      });
      setAmount(''); setLimitPrice(''); setStopPrice('');
      setTakeProfit(''); setStopLoss('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const formatPrice = (p) => {
    if (!p) return '---';
    if (p > 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p > 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
        border: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(148,163,184,0.12)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Zap size={18} className="text-[#E88F2B]" />
        <span className="text-lg font-black uppercase tracking-wider" style={tc('#94a3b8', '#475569')}>Place Order</span>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setSide('buy')}
          className="flex-1 py-3 rounded-xl text-[13px] font-black transition-all cursor-pointer"
          style={{
            background: side === 'buy' ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))' : 'transparent',
            border: side === 'buy' ? '1px solid rgba(34,197,94,0.4)' : darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(148,163,184,0.12)',
            color: side === 'buy' ? '#22c55e' : tc('#64748b', '#475569').color,
          }}
        ><ArrowUpRight size={14} className="inline mr-1" />BUY</button>
        <button onClick={() => setSide('sell')}
          className="flex-1 py-3 rounded-xl text-[13px] font-black transition-all cursor-pointer"
          style={{
            background: side === 'sell' ? 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.08))' : 'transparent',
            border: side === 'sell' ? '1px solid rgba(239,68,68,0.4)' : darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(148,163,184,0.12)',
            color: side === 'sell' ? '#ef4444' : tc('#64748b', '#475569').color,
          }}
        ><TrendingDown size={14} className="inline mr-1" />SELL</button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ORDER_TYPES.map((ot) => (
          <button key={ot} onClick={() => setOrderType(ot)}
            className="px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer"
            style={{
              background: orderType === ot ? 'rgba(232,143,43,0.12)' : 'transparent',
              border: orderType === ot ? '1px solid rgba(232,143,43,0.25)' : darkMode ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(148,163,184,0.08)',
              color: orderType === ot ? '#E88F2B' : tc('#64748b', '#475569').color,
            }}
          >{ot.replace('_', ' ')}</button>
        ))}
      </div>

      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={tc('#64748b', '#475569')}>Amount (USD)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00" min="0" step="0.01"
          className="w-full px-3 py-2.5 rounded-xl text-[13px] font-mono font-bold outline-none transition-all"
          style={{
            background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
            border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(148,163,184,0.15)',
            color: darkMode ? '#f1f5f9' : '#0f172a',
          }}
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px]" style={tc('#64748b', '#475569')}>Bal: ${balance.toFixed(2)}</span>
          {[25, 50, 75, 100].map((pct) => (
            <button key={pct} onClick={() => setAmount(((balance * pct) / 100).toFixed(2))}
              className="text-[10px] font-bold text-[#E88F2B] hover:text-[#f0a04b] cursor-pointer"
            >{pct}%</button>
          ))}
        </div>
      </div>

      {['limit', 'stop_limit'].includes(orderType) && (
        <div>
          <label className="text-[11px] font-bold uppercase block mb-1" style={tc('#64748b', '#475569')}>Limit Price (USD)</label>
          <input type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)}
            placeholder={formatPrice(currentPrice)} min="0" step="0.01"
            className="w-full px-3 py-2.5 rounded-xl text-[13px] font-mono font-bold outline-none"
            style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
              border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(148,163,184,0.15)',
              color: darkMode ? '#f1f5f9' : '#0f172a',
            }}
          />
        </div>
      )}

      {['stop', 'stop_limit'].includes(orderType) && (
        <div>
          <label className="text-[11px] font-bold uppercase block mb-1" style={tc('#64748b', '#475569')}>Stop Price (USD)</label>
          <input type="number" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)}
            placeholder={formatPrice(currentPrice)} min="0" step="0.01"
            className="w-full px-3 py-2.5 rounded-xl text-[13px] font-mono font-bold outline-none"
            style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
              border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(148,163,184,0.15)',
              color: darkMode ? '#f1f5f9' : '#0f172a',
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase block mb-1" style={tc('#64748b', '#475569')}>Take Profit</label>
          <input type="number" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)}
            placeholder="TP" min="0" step="0.01"
            className="w-full px-2.5 py-2 rounded-lg text-[11px] font-mono font-bold outline-none"
            style={{
              background: darkMode ? 'rgba(34,197,94,0.04)' : 'rgba(34,197,94,0.02)',
              border: '1px solid rgba(34,197,94,0.15)',
              color: darkMode ? '#f1f5f9' : '#0f172a',
            }}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase block mb-1" style={tc('#64748b', '#475569')}>Stop Loss</label>
          <input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
            placeholder="SL" min="0" step="0.01"
            className="w-full px-2.5 py-2 rounded-lg text-[11px] font-mono font-bold outline-none"
            style={{
              background: darkMode ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.02)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: darkMode ? '#f1f5f9' : '#0f172a',
            }}
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase block mb-1" style={tc('#64748b', '#475569')}>
          Leverage: {parsed.lev}x
        </label>
        <input type="range" value={leverage} onChange={(e) => setLeverage(e.target.value)}
          min="1" max="125" step="1"
          className="w-full accent-[#E88F2B]"
        />
        <div className="flex justify-between text-[9px]" style={tc('#64748b', '#475569')}>
          <span>1x</span><span>25x</span><span>50x</span><span>75x</span><span>100x</span><span>125x</span>
        </div>
      </div>

      <div className="rounded-xl p-3 space-y-1"
        style={{
          background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
          border: darkMode ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(148,163,184,0.08)',
        }}
      >
        <div className="flex justify-between text-[11px]">
          <span style={tc('#64748b', '#475569')}>Price</span>
          <span className="font-mono font-bold" style={tc('#cbd5e1', '#334155')}>${formatPrice(execPrice)}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span style={tc('#64748b', '#475569')}>Est. Quantity</span>
          <span className="font-mono font-bold" style={tc('#cbd5e1', '#334155')}>
            {estimatedQty.toFixed(8)} {asset?.symbol || ''}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span style={tc('#64748b', '#475569')}>Fee (0.1%)</span>
          <span className="font-mono font-bold text-[#E88F2B]">${fee.toFixed(4)}</span>
        </div>
        {parsed.lev > 1 && (
          <>
            <div className="flex justify-between text-[11px]">
              <span style={tc('#64748b', '#475569')}>Margin Required</span>
              <span className="font-mono font-bold" style={tc('#f59e0b', '#d97706')}>${marginRequired.toFixed(2)}</span>
            </div>
            {liquidationPrice && (
              <div className="flex justify-between text-[11px]">
                <span className="text-red-400">Liquidation Price</span>
                <span className="font-mono font-bold text-red-400">${formatPrice(liquidationPrice)}</span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between text-[11px] pt-1"
          style={{ borderTop: darkMode ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(148,163,184,0.08)' }}
        >
          <span className="font-bold" style={tc('#94a3b8', '#475569')}>{parsed.lev > 1 ? 'Total Exposure' : 'Total'}</span>
          <span className="font-mono font-black" style={tc('#e2e8f0', '#1e293b')}>
            ${(parsed.lev > 1 ? parsed.amount * parsed.lev : totalWithFee).toFixed(2)}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={12} className="text-red-400 shrink-0" />
          <span className="text-[11px] text-red-400">{error}</span>
        </div>
      )}

      {result && (
        <div className="rounded-lg px-3 py-2.5 text-[11px] font-bold space-y-1"
          style={{
            background: result.pending ? 'rgba(245,158,11,0.08)' : result.side === 'buy' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${result.pending ? 'rgba(245,158,11,0.2)' : result.side === 'buy' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: result.pending ? '#f59e0b' : result.side === 'buy' ? '#22c55e' : '#ef4444',
          }}
        >
          <div>{result.pending ? 'Limit Order Placed' : `${result.side.toUpperCase()} Order Filled`}</div>
          <div className="opacity-75">
            {result.quantity.toFixed(6)} {asset?.symbol} @ ${formatPrice(result.price)}
            {result.leverage > 1 && ` (${result.leverage}x)`}
          </div>
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading || !asset}
        className="w-full py-3 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: side === 'buy' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: '#fff',
        }}
      >
        {loading ? 'Executing...' : !asset ? 'Select Asset' : `${side === 'buy' ? 'BUY' : 'SELL'} ${asset?.symbol || ''}${parsed.lev > 1 ? ` ${parsed.lev}x` : ''}`}
      </button>
    </div>
  );
}
