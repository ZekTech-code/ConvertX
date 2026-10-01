import { useState, useMemo } from 'react';
import { ArrowUpRight, TrendingDown, Zap, AlertTriangle } from 'lucide-react';
import { BORDER, pick, PRIMARY, TEXT, TEXT_MUTED, TEXT_SECONDARY, WARNING } from "../../styles/colors";

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
        <Zap size={18} className="text-accent" />
        <span className="text-lg font-black uppercase tracking-wider" style={{ color: pick(TEXT_MUTED, darkMode) }}>Place Order</span>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setSide('buy')}
          className="flex-1 py-3 rounded-xl text-[13px] font-black transition-all cursor-pointer"
          style={{
            background: side === 'buy' ? 'rgba(34,197,94,0.2)' : 'transparent',
            border: side === 'buy' ? '1px solid rgba(34,197,94,0.4)' : darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(148,163,184,0.12)',
            color: side === 'buy' ? '#22c55e' : pick(TEXT_SECONDARY, darkMode).color,
          }}
        ><ArrowUpRight size={14} className="inline mr-1" />BUY</button>
        <button onClick={() => setSide('sell')}
          className="flex-1 py-3 rounded-xl text-[13px] font-black transition-all cursor-pointer"
          style={{
            background: side === 'sell' ? 'rgba(239,68,68,0.2)' : 'transparent',
            border: side === 'sell' ? '1px solid rgba(239,68,68,0.4)' : darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(148,163,184,0.12)',
            color: side === 'sell' ? '#ef4444' : pick(TEXT_SECONDARY, darkMode).color,
          }}
        ><TrendingDown size={14} className="inline mr-1" />SELL</button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ORDER_TYPES.map((ot) => (
          <button key={ot} onClick={() => setOrderType(ot)}
            className="px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer"
            style={{
              background: orderType === ot ? pick(PRIMARY, darkMode) : 'transparent',
              border: orderType === ot ? '1px solid ' + pick(PRIMARY, darkMode) : '1px solid ' + pick(BORDER, darkMode),
              color: orderType === ot ? '#ffffff' : pick(TEXT_SECONDARY, darkMode),
            }}
          >{ot.replace('_', ' ')}</button>
        ))}
      </div>

      <div>
        <label htmlFor="order-amount" className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: pick(TEXT_SECONDARY, darkMode) }}>Amount (USD)</label>
        <input id="order-amount" name="order-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00" min="0" step="0.01"
          className="w-full px-3 py-2.5 rounded-xl text-[13px] font-mono font-bold outline-none transition-all"
          style={{
            background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
            border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(148,163,184,0.15)',
            color: pick(TEXT, darkMode),
          }}
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px]" style={{ color: pick(TEXT_SECONDARY, darkMode) }}>Bal: ${balance.toFixed(2)}</span>
          {[25, 50, 75, 100].map((pct) => (
            <button key={pct} onClick={() => setAmount(((balance * pct) / 100).toFixed(2))}
              className="text-[10px] font-bold text-accent hover:text-accent-hover cursor-pointer"
            >{pct}%</button>
          ))}
        </div>
      </div>

      {['limit', 'stop_limit'].includes(orderType) && (
        <div>
          <label htmlFor="order-limit-price" className="text-[11px] font-bold uppercase block mb-1" style={{ color: pick(TEXT_SECONDARY, darkMode) }}>Limit Price (USD)</label>
          <input id="order-limit-price" name="order-limit-price" type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)}
            placeholder={formatPrice(currentPrice)} min="0" step="0.01"
            className="w-full px-3 py-2.5 rounded-xl text-[13px] font-mono font-bold outline-none"
            style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
              border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(148,163,184,0.15)',
              color: pick(TEXT, darkMode),
            }}
          />
        </div>
      )}

      {['stop', 'stop_limit'].includes(orderType) && (
        <div>
          <label htmlFor="order-stop-price" className="text-[11px] font-bold uppercase block mb-1" style={{ color: pick(TEXT_SECONDARY, darkMode) }}>Stop Price (USD)</label>
          <input id="order-stop-price" name="order-stop-price" type="number" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)}
            placeholder={formatPrice(currentPrice)} min="0" step="0.01"
            className="w-full px-3 py-2.5 rounded-xl text-[13px] font-mono font-bold outline-none"
            style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
              border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(148,163,184,0.15)',
              color: pick(TEXT, darkMode),
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="order-take-profit" className="text-[10px] font-bold uppercase block mb-1" style={{ color: pick(TEXT_SECONDARY, darkMode) }}>Take Profit</label>
          <input id="order-take-profit" name="order-take-profit" type="number" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)}
            placeholder="TP" min="0" step="0.01"
            className="w-full px-2.5 py-2 rounded-lg text-[11px] font-mono font-bold outline-none"
            style={{
              background: darkMode ? 'rgba(34,197,94,0.04)' : 'rgba(34,197,94,0.02)',
              border: '1px solid rgba(34,197,94,0.15)',
              color: pick(TEXT, darkMode),
            }}
          />
        </div>
        <div>
          <label htmlFor="order-stop-loss" className="text-[10px] font-bold uppercase block mb-1" style={{ color: pick(TEXT_SECONDARY, darkMode) }}>Stop Loss</label>
          <input id="order-stop-loss" name="order-stop-loss" type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
            placeholder="SL" min="0" step="0.01"
            className="w-full px-2.5 py-2 rounded-lg text-[11px] font-mono font-bold outline-none"
            style={{
              background: darkMode ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.02)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: pick(TEXT, darkMode),
            }}
          />
        </div>
      </div>

      <div>
        <label htmlFor="order-leverage" className="text-[10px] font-bold uppercase block mb-1" style={{ color: pick(TEXT_SECONDARY, darkMode) }}>
          Leverage: {parsed.lev}x
        </label>
        <input id="order-leverage" name="order-leverage" type="range" value={leverage} onChange={(e) => setLeverage(e.target.value)}
          min="1" max="125" step="1"
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-[9px]" style={{ color: pick(TEXT_SECONDARY, darkMode) }}>
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
          <span style={{ color: pick(TEXT_SECONDARY, darkMode) }}>Price</span>
          <span className="font-mono font-bold" style={{ color: pick(TEXT, darkMode) }}>${formatPrice(execPrice)}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span style={{ color: pick(TEXT_SECONDARY, darkMode) }}>Est. Quantity</span>
          <span className="font-mono font-bold" style={{ color: pick(TEXT, darkMode) }}>
            {estimatedQty.toFixed(8)} {asset?.symbol || ''}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span style={{ color: pick(TEXT_SECONDARY, darkMode) }}>Fee (0.1%)</span>
          <span className="font-mono font-bold text-accent">${fee.toFixed(4)}</span>
        </div>
        {parsed.lev > 1 && (
          <>
            <div className="flex justify-between text-[11px]">
              <span style={{ color: pick(TEXT_SECONDARY, darkMode) }}>Margin Required</span>
              <span className="font-mono font-bold" style={{ color: pick(WARNING, darkMode) }}>${marginRequired.toFixed(2)}</span>
            </div>
            {liquidationPrice && (
              <div className="flex justify-between text-[11px]">
                <span className="text-negative">Liquidation Price</span>
                <span className="font-mono font-bold text-negative">${formatPrice(liquidationPrice)}</span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between text-[11px] pt-1"
          style={{ borderTop: darkMode ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(148,163,184,0.08)' }}
        >
          <span className="font-bold" style={{ color: pick(TEXT_MUTED, darkMode) }}>{parsed.lev > 1 ? 'Total Exposure' : 'Total'}</span>
          <span className="font-mono font-black" style={{ color: pick(TEXT, darkMode) }}>
            ${(parsed.lev > 1 ? parsed.amount * parsed.lev : totalWithFee).toFixed(2)}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-danger-soft border border-danger-border">
          <AlertTriangle size={12} className="text-negative shrink-0" />
          <span className="text-[11px] text-negative">{error}</span>
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
          background: side === 'buy' ? '#22c55e' : '#ef4444',
          color: '#fff',
        }}
      >
        {loading ? 'Executing...' : !asset ? 'Select Asset' : `${side === 'buy' ? 'BUY' : 'SELL'} ${asset?.symbol || ''}${parsed.lev > 1 ? ` ${parsed.lev}x` : ''}`}
      </button>
    </div>
  );
}
