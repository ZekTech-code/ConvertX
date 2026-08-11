import { useState, useMemo } from 'react';
import { Search, RefreshCw, Filter, ChevronDown } from 'lucide-react';
import { getCoinIcon } from '../../utils/coinIcons';

const MARKET_CATEGORIES = { crypto: 'Crypto', forex: 'Forex', stocks: 'Stocks', commodities: 'Commodities' };

function formatNum(n) {
  if (!n && n !== 0) return '---';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatPrice(p) {
  if (!p && p !== 0) return '---';
  if (p > 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p > 1) return p.toFixed(4);
  return p.toFixed(6);
}

function SortHeader({ field, label, sortBy, sortDir, onSort, darkMode }) {
  return (
    <button
      onClick={() => onSort(field)}
      className="text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:text-[#E88F2B] transition-colors flex items-center gap-1"
      style={{ color: sortBy === field ? '#E88F2B' : darkMode ? '#64748b' : '#475569' }}
    >
      {label}
      {sortBy === field && <ChevronDown size={10} className={`transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} />}
    </button>
  );
}

export default function MarketExchange({ allPrices, darkMode, onSelectAsset, selectedAssetId, marketData }) {
  const [category, setCategory] = useState('crypto');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('volume');
  const [sortDir, setSortDir] = useState('desc');

  const tc = (dark, light) => ({ color: darkMode ? dark : light });

  const filtered = useMemo(() => {
    let items = [...(allPrices || [])];
    if (category === 'crypto') items = items.filter((p) => p.type === 'crypto');
    else if (category === 'forex') items = items.filter((p) => p.type === 'forex');
    else items = items.filter((p) => p.type === category);

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((p) => p.symbol?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q));
    }

    items.sort((a, b) => {
      let va, vb;
      if (sortBy === 'price') { va = a.price || 0; vb = b.price || 0; }
      else if (sortBy === 'change') { va = a.change || 0; vb = b.change || 0; }
      else if (sortBy === 'volume') { va = a.volume || 0; vb = b.volume || 0; }
      else { va = a.price || 0; vb = b.price || 0; }
      return sortDir === 'desc' ? vb - va : va - vb;
    });

    return items;
  }, [allPrices, category, search, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortBy(field); setSortDir('desc'); }
  };

  return (
    <div className="rounded-2xl flex flex-col gap-3 p-4"
      style={{
        background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
        border: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(148,163,184,0.12)',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[#E88F2B]" />
          <span className="text-lg font-black uppercase tracking-wider" style={tc('#94a3b8', '#475569')}>
            Market Exchange
          </span>
        </div>
        <button onClick={marketData?.refresh}
          className="p-1.5 rounded-lg transition-all cursor-pointer"
          style={{ background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' }}
        >
          <RefreshCw size={12} className={marketData?.loading ? 'animate-spin' : ''} style={tc('#94a3b8', '#475569')} />
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {Object.entries(MARKET_CATEGORIES).map(([key, label]) => (
          <button key={key} onClick={() => setCategory(key)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
            style={{
              background: category === key ? 'linear-gradient(135deg, #E88F2B, #d97706)' : darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)',
              color: category === key ? '#000' : tc('#64748b', '#475569').color,
            }}
          >{label}</button>
        ))}
      </div>

      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: darkMode ? '#64748b' : '#94a3b8' }} />
        <label htmlFor="market-exchange-search" className="sr-only">Search markets</label>
        <input id="market-exchange-search" name="market-exchange-search" type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search markets..."
          className="w-full pl-8 pr-3 py-2 rounded-lg text-[12px] font-bold outline-none transition-all"
          style={{
            background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
            border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(148,163,184,0.15)',
            color: darkMode ? '#e2e8f0' : '#0f172a',
          }}
        />
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-2 pb-2"
          style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(148,163,184,0.1)' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider" style={tc('#64748b', '#475569')}>Pair</span>
          <SortHeader field="price" label="Price" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} darkMode={darkMode} />
          <SortHeader field="change" label="24h" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} darkMode={darkMode} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-right" style={tc('#64748b', '#475569')}>High</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-right" style={tc('#64748b', '#475569')}>Low</span>
          <SortHeader field="volume" label="Volume" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} darkMode={darkMode} />
        </div>

        <div className="max-h-[400px] overflow-y-auto space-y-0.5">
          {filtered.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[13px]" style={tc('#64748b', '#475569')}>No markets found</p>
            </div>
          )}
          {filtered.map((item) => {
            const isSelected = item.id === selectedAssetId;
            const hasPrice = item.price != null && item.price > 0;
            const change24h = item.change != null && Number.isFinite(Number(item.change)) ? Number(item.change) : null;
            let high = null;
            let low = null;
            if (hasPrice && change24h != null) {
              if (change24h >= 0) {
                high = item.price;
                low = item.price / (1 + change24h / 100);
              } else {
                high = item.price / (1 + change24h / 100);
                low = item.price;
              }
            }
            return (
              <button key={item.id} onClick={() => onSelectAsset?.(item)}
                className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-2 py-2.5 rounded-lg transition-all cursor-pointer text-left"
                style={{
                  background: isSelected ? 'rgba(232,143,43,0.08)' : 'transparent',
                  border: isSelected ? '1px solid rgba(232,143,43,0.2)' : '1px solid transparent',
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.type === 'crypto' && (
                    <img src={getCoinIcon(item.id)} alt="" width={22} height={22} className="rounded-full" />
                  )}
                  <div className="min-w-0">
                    <span className="text-[13px] font-black block truncate" style={tc('#e2e8f0', '#1e293b')}>{item.symbol}</span>
                    <span className="text-[10px]" style={tc('#64748b', '#475569')}>{item.name}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-[12px] font-mono font-bold" style={tc('#e2e8f0', '#1e293b')}>
                    {hasPrice ? `$${formatPrice(item.price)}` : "—"}
                  </span>
                </div>
                <div className="flex items-center">
                  {hasPrice && item.change != null ? (
                    <span className="text-[12px] font-mono font-bold" style={{ color: item.change >= 0 ? '#22c55e' : '#ef4444' }}>
                      {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-[12px] font-mono font-bold" style={tc('#64748b', '#475569')}>—</span>
                  )}
                </div>
                <div className="flex items-center justify-end">
                  <span className="text-[11px] font-mono" style={tc('#94a3b8', '#475569')}>{high != null ? `$${formatPrice(high)}` : "—"}</span>
                </div>
                <div className="flex items-center justify-end">
                  <span className="text-[11px] font-mono" style={tc('#94a3b8', '#475569')}>{low != null ? `$${formatPrice(low)}` : "—"}</span>
                </div>
                <div className="flex items-center justify-end">
                  <span className="text-[11px] font-mono" style={tc('#94a3b8', '#475569')}>{formatNum(item.volume)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
