export function calculateEMA(data, period) {
  if (!data || data.length < period) return [];
  const k = 2 / (period + 1);
  const result = [];
  let ema = data[0];
  for (let i = 0; i < data.length; i++) {
    ema = i === 0 ? data[i] : data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

export function calculateSMA(data, period) {
  if (!data || data.length < period) return [];
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(data[i]); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(sum / period);
  }
  return result;
}

export function calculateRSI(data, period = 14) {
  if (!data || data.length < period + 1) return { rsi: 50, oversold: false, overbought: false };
  const changes = [];
  for (let i = 1; i < data.length; i++) changes.push(data[i] - data[i - 1]);
  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? -c : 0));
  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return { rsi: 100, oversold: false, overbought: true };
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return { rsi, oversold: rsi < 30, overbought: rsi > 70 };
}

export function calculateMACD(data, fast = 12, slow = 26, signal = 9) {
  if (!data || data.length < slow) return { macd: null, signal: null, histogram: null };
  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);
  const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = calculateEMA(macdLine, signal);
  const histogram = macdLine.map((v, i) => v - (signalLine[i] || 0));
  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalLine[signalLine.length - 1],
    histogram: histogram[histogram.length - 1],
    macdLine, signalLine, histogram,
  };
}

export function calculateBollinger(data, period = 20, multiplier = 2) {
  if (!data || data.length < period) return null;
  const sma = calculateSMA(data, period);
  const lastSma = sma[sma.length - 1];
  let sumSq = 0;
  for (let i = data.length - period; i < data.length; i++) {
    sumSq += Math.pow(data[i] - sma[i], 2);
  }
  const std = Math.sqrt(sumSq / period);
  return {
    upper: lastSma + multiplier * std,
    middle: lastSma,
    lower: lastSma - multiplier * std,
    bandwidth: ((lastSma + multiplier * std) - (lastSma - multiplier * std)) / lastSma,
  };
}

export function calculateVWAP(candles) {
  if (!candles || candles.length < 1) return null;
  let cumPV = 0;
  let cumVol = 0;
  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3;
    cumPV += typical * c.volume;
    cumVol += c.volume;
  }
  return cumVol > 0 ? cumPV / cumVol : null;
}

export function calculateATR(candles, period = 14) {
  if (!candles || candles.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  const atr = trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  return atr;
}

export function calculateSupertrend(candles, period = 10, multiplier = 3) {
  if (!candles || candles.length < period + 1) return null;
  const atr = calculateATR(candles, period);
  if (!atr) return null;
  const last = candles[candles.length - 1];
  const hl2 = (last.high + last.low) / 2;
  const upperBand = hl2 + multiplier * atr;
  const lowerBand = hl2 - multiplier * atr;
  return { upperBand, lowerBand, trend: last.close > lowerBand ? 'up' : 'down' };
}

export function calculateStochRSI(data, period = 14, smoothK = 3, smoothD = 3) {
  if (!data || data.length < period * 2) return null;
  const rsis = [];
  for (let i = period; i < data.length; i++) {
    const slice = data.slice(i - period, i + 1);
    const { rsi } = calculateRSI(slice, period);
    rsis.push(rsi);
  }
  if (rsis.length < smoothK) return null;
  const stoch = [];
  for (let i = smoothK - 1; i < rsis.length; i++) {
    const slice = rsis.slice(i - smoothK + 1, i + 1);
    const min = Math.min(...slice);
    const max = Math.max(...slice);
    stoch.push(max === min ? 0.5 : (slice[slice.length - 1] - min) / (max - min));
  }
  const k = stoch[stoch.length - 1] * 100;
  const d = stoch.slice(-smoothD).reduce((a, b) => a + b, 0) / smoothD * 100;
  return { k, d, oversold: k < 20, overbought: k > 80 };
}

export function generateSignals(closes, candles) {
  const signals = [];
  if (!closes || closes.length < 30) return signals;

  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const rsiData = calculateRSI(closes);
  const macdData = calculateMACD(closes);
  const bb = calculateBollinger(closes);
  const atr = candles ? calculateATR(candles) : null;
  const supertrend = candles ? calculateSupertrend(candles) : null;
  const stochRsi = calculateStochRSI(closes);

  const lastPrice = closes[closes.length - 1];
  const prevPrice = closes[closes.length - 2];

  if (ema9.length > 1 && ema21.length > 1) {
    const lastEma9 = ema9[ema9.length - 1];
    const prevEma9 = ema9[ema9.length - 2];
    const lastEma21 = ema21[ema21.length - 1];
    const prevEma21 = ema21[ema21.length - 2];
    if (prevEma9 <= prevEma21 && lastEma9 > lastEma21) {
      signals.push({ type: 'BUY', source: 'EMA Crossover', strength: 85, message: 'EMA 9 crossed above EMA 21' });
    } else if (prevEma9 >= prevEma21 && lastEma9 < lastEma21) {
      signals.push({ type: 'SELL', source: 'EMA Crossover', strength: 85, message: 'EMA 9 crossed below EMA 21' });
    }
  }

  if (rsiData.oversold) {
    signals.push({ type: 'BUY', source: 'RSI', strength: 80, message: `RSI at ${rsiData.rsi.toFixed(1)} - oversold` });
  } else if (rsiData.overbought) {
    signals.push({ type: 'SELL', source: 'RSI', strength: 80, message: `RSI at ${rsiData.rsi.toFixed(1)} - overbought` });
  }

  if (macdData.macd != null && macdData.signal != null) {
    if (macdData.macd > macdData.signal && macdData.histogram > 0) {
      signals.push({ type: 'BUY', source: 'MACD', strength: 75, message: 'MACD above signal line' });
    } else if (macdData.macd < macdData.signal && macdData.histogram < 0) {
      signals.push({ type: 'SELL', source: 'MACD', strength: 75, message: 'MACD below signal line' });
    }
  }

  if (bb) {
    if (lastPrice <= bb.lower * 1.01) {
      signals.push({ type: 'BUY', source: 'Bollinger', strength: 70, message: 'Price near lower band' });
    } else if (lastPrice >= bb.upper * 0.99) {
      signals.push({ type: 'SELL', source: 'Bollinger', strength: 70, message: 'Price near upper band' });
    }
  }

  if (supertrend) {
    signals.push({
      type: supertrend.trend === 'up' ? 'BUY' : 'SELL',
      source: 'Supertrend',
      strength: 65,
      message: `Supertrend indicates ${supertrend.trend}trend`,
    });
  }

  if (stochRsi) {
    if (stochRsi.oversold) {
      signals.push({ type: 'BUY', source: 'Stoch RSI', strength: 75, message: 'Stochastic RSI oversold' });
    } else if (stochRsi.overbought) {
      signals.push({ type: 'SELL', source: 'Stoch RSI', strength: 75, message: 'Stochastic RSI overbought' });
    }
  }

  const sma20 = calculateSMA(closes, 20);
  if (sma20.length > 0) {
    const lastSma = sma20[sma20.length - 1];
    if (lastPrice > lastSma * 1.02) {
      signals.push({ type: 'BUY', source: 'MA Trend', strength: 50, message: 'Price above SMA 20' });
    } else if (lastPrice < lastSma * 0.98) {
      signals.push({ type: 'SELL', source: 'MA Trend', strength: 50, message: 'Price below SMA 20' });
    }
  }

  const momentum = ((lastPrice - closes[Math.max(0, closes.length - 10)]) / closes[Math.max(0, closes.length - 10)]) * 100;
  if (momentum > 2) {
    signals.push({ type: 'BUY', source: 'Momentum', strength: 60, message: `Strong momentum +${momentum.toFixed(1)}%` });
  } else if (momentum < -2) {
    signals.push({ type: 'SELL', source: 'Momentum', strength: 60, message: `Strong momentum ${momentum.toFixed(1)}%` });
  }

  const upBars = closes.slice(-5).filter((c, i, arr) => i > 0 && c > arr[i - 1]).length;
  if (upBars >= 4) {
    signals.push({ type: 'BUY', source: 'Price Action', strength: 55, message: 'Strong buying pressure' });
  } else if (upBars <= 1) {
    signals.push({ type: 'SELL', source: 'Price Action', strength: 55, message: 'Strong selling pressure' });
  }

  return signals;
}

export function aggregateSignal(signals) {
  if (!signals || signals.length === 0) return { type: 'NEUTRAL', strength: 0, confidence: 0 };
  const buySignals = signals.filter((s) => s.type === 'BUY');
  const sellSignals = signals.filter((s) => s.type === 'SELL');
  const buyStrength = buySignals.reduce((sum, s) => sum + s.strength, 0);
  const sellStrength = sellSignals.reduce((sum, s) => sum + s.strength, 0);
  const totalStrength = buyStrength + sellStrength || 1;

  let type;
  let confidence;

  if (buySignals.length > sellSignals.length && buyStrength > sellStrength) {
    type = 'BUY';
    confidence = Math.round(50 + (buyStrength / (buySignals.length || 1)) * 0.5);
  } else if (sellSignals.length > buySignals.length && sellStrength > buyStrength) {
    type = 'SELL';
    confidence = Math.round(50 + (sellStrength / (sellSignals.length || 1)) * 0.5);
  } else if (buyStrength > sellStrength && buySignals.length >= 2) {
    type = 'BUY';
    confidence = Math.round(45 + (buyStrength / (buySignals.length || 1)) * 0.3);
  } else if (sellStrength > buyStrength && sellSignals.length >= 2) {
    type = 'SELL';
    confidence = Math.round(45 + (sellStrength / (sellSignals.length || 1)) * 0.3);
  } else {
    type = 'NEUTRAL';
    confidence = 30;
  }

  const maxConfidence = Math.min(98, Math.max(15, confidence));
  const finalType = maxConfidence >= 75 ? (type === 'BUY' ? 'STRONG BUY' : type === 'SELL' ? 'STRONG SELL' : type) : type;

  return { type: finalType, strength: maxConfidence, confidence: maxConfidence, signals };
}

export function calculatePositionSize(balance, riskPercent, entryPrice, stopLoss, leverage = 1) {
  const riskAmount = balance * (riskPercent / 100);
  const priceRisk = Math.abs(entryPrice - stopLoss);
  if (priceRisk === 0) return 0;
  const positionSize = (riskAmount / priceRisk) * entryPrice * leverage;
  return positionSize;
}

export function calculateTakeProfits(entryPrice, side, levels = 3) {
  const tps = [];
  const rr = [2, 3, 5];
  for (let i = 0; i < levels; i++) {
    const target = side === 'long'
      ? entryPrice * (1 + rr[i] * 0.01)
      : entryPrice * (1 - rr[i] * 0.01);
    tps.push({ level: i + 1, price: target, rrr: rr[i] });
  }
  return tps;
}
