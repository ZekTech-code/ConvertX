import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/useAuth";

const TRADING_FEE = 0.001;

function generateId() {
  const arr = new Uint8Array(8);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useTrading(getPrice, getPriceHistory) {
  const { user, trading, tradingRef, updateTradingState } = useAuth();
  const mountedRef = useRef(true);

  const startingBalance = trading?.startingBalance ?? 10000;
  const balance = trading?.balance ?? 10000;
  const positions = trading?.positions ?? [];
  const trades = trading?.trades ?? [];
  const pendingOrders = trading?.pendingOrders ?? [];
  const alerts = trading?.alerts ?? [];

  const [selectedAsset, setSelectedAsset] = useState(null);
  const [lastTriggeredAlerts, setLastTriggeredAlerts] = useState([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const patchTrading = useCallback((patch) => {
    const next = { ...(tradingRef.current || { balance: 10000, startingBalance: 10000, positions: [], trades: [], pendingOrders: [], alerts: [] }), ...patch };
    updateTradingState(next);
  }, [tradingRef, updateTradingState]);

  const executeOrder = useCallback(
    (order) => {
      const { assetId, assetSymbol, assetName, type, amount, orderType, limitPrice, takeProfit, stopLoss } = order;
      const currentPrice = getPrice(assetId);

      if (!currentPrice || !Number.isFinite(currentPrice) || currentPrice <= 0) {
        throw new Error("Unable to fetch current price. Please try again.");
      }

      if (amount <= 0 || !Number.isFinite(amount)) {
        throw new Error("Invalid order amount.");
      }

      const totalCost = amount;
      const fee = totalCost * TRADING_FEE;
      const totalWithFee = totalCost + fee;
      const priceAtExecution = orderType === "limit" && limitPrice ? limitPrice : currentPrice;
      const quantity = totalCost / priceAtExecution;
      const curBalance = tradingRef.current?.balance ?? 10000;
      const curPositions = tradingRef.current?.positions ?? [];
      const curPending = tradingRef.current?.pendingOrders ?? [];

      if (type === "buy") {
        if (totalWithFee > curBalance) {
          throw new Error(`Insufficient balance. You have $${curBalance.toFixed(2)} but need $${totalWithFee.toFixed(2)} (including 0.1% fee).`);
        }

        if (orderType === "limit" && limitPrice && limitPrice < currentPrice) {
          const newOrder = {
            id: generateId(),
            assetId, assetSymbol, assetName,
            type: "buy",
            amount: totalCost,
            limitPrice,
            takeProfit: takeProfit || null,
            stopLoss: stopLoss || null,
            quantity,
            timestamp: Date.now(),
            status: "pending",
          };
          if (mountedRef.current) {
            patchTrading({
              balance: curBalance - totalWithFee,
              pendingOrders: [newOrder, ...curPending],
              trades: [{ ...newOrder, side: "buy", orderType: "limit", price: limitPrice, total: totalCost, status: "pending" }, ...(tradingRef.current?.trades ?? [])],
            });
          }
          return { success: true, quantity, price: limitPrice, pending: true };
        }

        const existingPos = curPositions.find((p) => p.assetId === assetId && p.positionType === "long");
        let newPositions;

        if (existingPos) {
          const totalQty = existingPos.quantity + quantity;
          const avgPrice = (existingPos.avgPrice * existingPos.quantity + priceAtExecution * quantity) / totalQty;
          newPositions = curPositions.map((p) =>
            p.assetId === assetId && p.positionType === "long"
              ? { ...p, quantity: totalQty, avgPrice, updatedAt: Date.now(), takeProfit: takeProfit || p.takeProfit, stopLoss: stopLoss || p.stopLoss }
              : p
          );
        } else {
          newPositions = [
            ...curPositions,
            {
              id: generateId(),
              assetId, assetSymbol, assetName,
              positionType: "long",
              quantity,
              avgPrice: priceAtExecution,
              takeProfit: takeProfit || null,
              stopLoss: stopLoss || null,
              openedAt: Date.now(),
              updatedAt: Date.now(),
            },
          ];
        }

        const newTrade = {
          id: generateId(), assetId, assetSymbol, assetName,
          side: "buy", orderType, quantity, price: priceAtExecution,
          total: totalCost, fee, timestamp: Date.now(),
          status: "filled",
        };

        if (mountedRef.current) {
          patchTrading({
            balance: curBalance - totalWithFee,
            positions: newPositions,
            trades: [newTrade, ...(tradingRef.current?.trades ?? [])],
          });
        }

        return { success: true, quantity, price: priceAtExecution, fee };
      }

      if (type === "sell") {
        const pos = curPositions.find((p) => p.assetId === assetId);
        if (!pos || pos.quantity < quantity) {
          const available = pos ? pos.quantity : 0;
          throw new Error(`Insufficient position. You have ${available.toFixed(6)} ${assetSymbol} but tried to sell ${quantity.toFixed(6)}.`);
        }

        const grossPnl = (priceAtExecution - pos.avgPrice) * quantity * (pos.positionType === "short" ? -1 : 1);
        const pnl = grossPnl - fee;
        const remaining = pos.quantity - quantity;
        let newPositions;

        if (remaining < 0.000001) {
          newPositions = curPositions.filter((p) => p.id !== pos.id);
        } else {
          newPositions = curPositions.map((p) =>
            p.id === pos.id ? { ...p, quantity: remaining, updatedAt: Date.now() } : p
          );
        }

        const newTrade = {
          id: generateId(), assetId, assetSymbol, assetName,
          side: "sell", orderType, quantity, price: priceAtExecution,
          total: totalCost, pnl, fee, timestamp: Date.now(),
          status: "filled", positionType: pos.positionType,
        };

        if (mountedRef.current) {
          patchTrading({
            balance: curBalance + totalCost - fee,
            positions: newPositions,
            trades: [newTrade, ...(tradingRef.current?.trades ?? [])],
          });
        }

        return { success: true, quantity, price: priceAtExecution, pnl, fee };
      }

      throw new Error("Invalid order type.");
    },
    [getPrice, patchTrading, tradingRef]
  );

  const openShort = useCallback(
    (order) => {
      const { assetId, assetSymbol, assetName, amount, orderType, limitPrice, takeProfit, stopLoss } = order;
      const currentPrice = getPrice(assetId);

      if (!currentPrice || !Number.isFinite(currentPrice) || currentPrice <= 0) {
        throw new Error("Unable to fetch current price.");
      }
      if (amount <= 0) throw new Error("Invalid amount.");

      const totalCost = amount;
      const fee = totalCost * TRADING_FEE;
      const totalWithFee = totalCost + fee;
      const priceAtExecution = orderType === "limit" && limitPrice ? limitPrice : currentPrice;
      const quantity = totalCost / priceAtExecution;
      const curBalance = tradingRef.current?.balance ?? 10000;
      const curPositions = tradingRef.current?.positions ?? [];

      if (totalWithFee > curBalance) {
        throw new Error(`Insufficient balance. Need $${totalWithFee.toFixed(2)} (including fee).`);
      }

      if (orderType === "limit" && limitPrice && limitPrice > currentPrice) {
        const curPending = tradingRef.current?.pendingOrders ?? [];
        const newOrder = {
          id: generateId(), assetId, assetSymbol, assetName,
          type: "short", amount: totalCost, limitPrice,
          takeProfit: takeProfit || null, stopLoss: stopLoss || null,
          quantity, timestamp: Date.now(), status: "pending",
        };
        if (mountedRef.current) {
          patchTrading({
            balance: curBalance - totalWithFee,
            pendingOrders: [newOrder, ...curPending],
            trades: [{ ...newOrder, side: "sell", orderType: "limit", price: limitPrice, total: totalCost, status: "pending", positionType: "short" }, ...(tradingRef.current?.trades ?? [])],
          });
        }
        return { success: true, quantity, price: limitPrice, pending: true };
      }

      const existingPos = curPositions.find((p) => p.assetId === assetId && p.positionType === "short");
      let newPositions;

      if (existingPos) {
        const totalQty = existingPos.quantity + quantity;
        const avgPrice = (existingPos.avgPrice * existingPos.quantity + priceAtExecution * quantity) / totalQty;
        newPositions = curPositions.map((p) =>
          p.assetId === assetId && p.positionType === "short"
            ? { ...p, quantity: totalQty, avgPrice, updatedAt: Date.now() }
            : p
        );
      } else {
        newPositions = [
          ...curPositions,
          {
            id: generateId(), assetId, assetSymbol, assetName,
            positionType: "short", quantity, avgPrice: priceAtExecution,
            takeProfit: takeProfit || null, stopLoss: stopLoss || null,
            openedAt: Date.now(), updatedAt: Date.now(),
          },
        ];
      }

      const newTrade = {
        id: generateId(), assetId, assetSymbol, assetName,
        side: "sell", orderType, quantity, price: priceAtExecution,
        total: totalCost, fee, timestamp: Date.now(),
        status: "filled", positionType: "short",
      };

      if (mountedRef.current) {
        patchTrading({
          balance: curBalance - totalWithFee,
          positions: newPositions,
          trades: [newTrade, ...(tradingRef.current?.trades ?? [])],
        });
      }

      return { success: true, quantity, price: priceAtExecution, fee };
    },
    [getPrice, patchTrading, tradingRef]
  );

  const checkPendingOrders = useCallback(() => {
    const curPending = tradingRef.current?.pendingOrders ?? [];
    if (curPending.length === 0) return;

    const filled = [];
    const remaining = [];

    for (const order of curPending) {
      const currentPrice = getPrice(order.assetId);
      if (!currentPrice) { remaining.push(order); continue; }

      let shouldFill = false;
      if (order.type === "buy" && currentPrice <= order.limitPrice) shouldFill = true;
      if (order.type === "short" && currentPrice >= order.limitPrice) shouldFill = true;

      if (shouldFill) {
        filled.push(order);
      } else {
        remaining.push(order);
      }
    }

    if (filled.length > 0) {
      patchTrading({ pendingOrders: remaining });
      for (const order of filled) {
        try {
          if (order.type === "buy") {
            executeOrder({
              assetId: order.assetId, assetSymbol: order.assetSymbol, assetName: order.assetName,
              type: "buy", amount: order.amount, orderType: "market",
              takeProfit: order.takeProfit, stopLoss: order.stopLoss,
            });
          } else if (order.type === "short") {
            openShort({
              assetId: order.assetId, assetSymbol: order.assetSymbol, assetName: order.assetName,
              amount: order.amount, orderType: "market",
              takeProfit: order.takeProfit, stopLoss: order.stopLoss,
            });
          }
          patchTrading({
            trades: (tradingRef.current?.trades ?? []).map((t) =>
              t.id === order.id ? { ...t, status: "filled", filledAt: Date.now() } : t
            ),
          });
        } catch {}
      }
    }
  }, [getPrice, patchTrading, tradingRef, executeOrder, openShort]);

  const checkTPSL = useCallback(() => {
    const curPositions = tradingRef.current?.positions ?? [];
    for (const pos of curPositions) {
      const currentPrice = getPrice(pos.assetId);
      if (!currentPrice) continue;

      let shouldClose = false;
      let reason = "";

      if (pos.takeProfit) {
        if (pos.positionType === "long" && currentPrice >= pos.takeProfit) { shouldClose = true; reason = "TP"; }
        if (pos.positionType === "short" && currentPrice <= pos.takeProfit) { shouldClose = true; reason = "TP"; }
      }
      if (pos.stopLoss) {
        if (pos.positionType === "long" && currentPrice <= pos.stopLoss) { shouldClose = true; reason = "SL"; }
        if (pos.positionType === "short" && currentPrice >= pos.stopLoss) { shouldClose = true; reason = "SL"; }
      }

      if (shouldClose) {
        try {
          const sellType = pos.positionType === "short" ? "buy" : "sell";
          executeOrder({
            assetId: pos.assetId, assetSymbol: pos.assetSymbol, assetName: pos.assetName,
            type: sellType, amount: currentPrice * pos.quantity, orderType: "market",
          });
        } catch {}
      }
    }
  }, [getPrice, tradingRef, executeOrder]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkPendingOrders();
      checkTPSL();
    }, 10000);
    return () => clearInterval(interval);
  }, [checkPendingOrders, checkTPSL]);

  const closePosition = useCallback(
    (positionId) => {
      const curPositions = tradingRef.current?.positions ?? [];
      const pos = curPositions.find((p) => p.id === positionId);
      if (!pos) throw new Error("Position not found.");

      const currentPrice = getPrice(pos.assetId);
      if (!currentPrice) throw new Error("Unable to fetch current price.");

      const sellType = pos.positionType === "short" ? "buy" : "sell";
      return executeOrder({
        assetId: pos.assetId, assetSymbol: pos.assetSymbol, assetName: pos.assetName,
        type: sellType, amount: currentPrice * pos.quantity, orderType: "market",
      });
    },
    [getPrice, executeOrder, tradingRef]
  );

  const cancelPendingOrder = useCallback(
    (orderId) => {
      const curPending = tradingRef.current?.pendingOrders ?? [];
      const order = curPending.find((o) => o.id === orderId);
      if (!order) return;

      const refund = order.amount + order.amount * TRADING_FEE;
      const curBalance = tradingRef.current?.balance ?? 10000;

      patchTrading({
        pendingOrders: curPending.filter((o) => o.id !== orderId),
        balance: curBalance + refund,
        trades: (tradingRef.current?.trades ?? []).map((t) =>
          t.id === orderId ? { ...t, status: "cancelled" } : t
        ),
      });
    },
    [patchTrading, tradingRef]
  );

  const addAlert = useCallback(
    (alert) => {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }
      const curAlerts = tradingRef.current?.alerts ?? [];
      const newAlert = { id: generateId(), ...alert, createdAt: Date.now(), triggered: false };
      patchTrading({ alerts: [newAlert, ...curAlerts] });
    },
    [patchTrading, tradingRef]
  );

  const removeAlert = useCallback(
    (alertId) => {
      const curAlerts = tradingRef.current?.alerts ?? [];
      patchTrading({ alerts: curAlerts.filter((a) => a.id !== alertId) });
    },
    [patchTrading, tradingRef]
  );

  const checkAlerts = useCallback(() => {
    const curAlerts = tradingRef.current?.alerts ?? [];
    const triggered = [];
    const remaining = [];

    for (const alert of curAlerts) {
      if (alert.triggered) { remaining.push(alert); continue; }
      const price = getPrice(alert.assetId);
      if (!price) { remaining.push(alert); continue; }

      if (alert.condition === "above" && price >= alert.targetPrice) {
        triggered.push(alert);
        remaining.push({ ...alert, triggered: true, triggeredAt: Date.now() });
      } else if (alert.condition === "below" && price <= alert.targetPrice) {
        triggered.push(alert);
        remaining.push({ ...alert, triggered: true, triggeredAt: Date.now() });
      } else {
        remaining.push(alert);
      }
    }

    if (triggered.length > 0) {
      patchTrading({ alerts: remaining });
      setLastTriggeredAlerts(triggered);

      // Play alert sound — 3 rounds of triple beep
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        for (let round = 0; round < 3; round++) {
          const offset = round * 0.6;
          [0, 0.15, 0.3].forEach((delay) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, ctx.currentTime + offset + delay);
            gain.gain.setValueAtTime(0.3, ctx.currentTime + offset + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + delay + 0.12);
            osc.start(ctx.currentTime + offset + delay);
            osc.stop(ctx.currentTime + offset + delay + 0.12);
          });
        }
      } catch {}

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        for (const a of triggered) {
          new Notification(`Price Alert: ${a.assetSymbol}`, {
            body: `${a.assetSymbol} is now $${getPrice(a.assetId)?.toFixed(2)} (${a.condition} $${a.targetPrice})`,
          });
        }
      }
    }
  }, [getPrice, patchTrading, tradingRef]);

  useEffect(() => {
    const interval = setInterval(checkAlerts, 15000);
    return () => clearInterval(interval);
  }, [checkAlerts]);

  const resetAccount = useCallback(() => {
    patchTrading({
      balance: 10000,
      startingBalance: 10000,
      positions: [],
      trades: [],
      pendingOrders: [],
      alerts: [],
    });
  }, [patchTrading]);

  const portfolioValue = useCallback(() => {
    let value = balance;
    for (const pos of positions) {
      const price = getPrice(pos.assetId);
      if (price) value += price * pos.quantity;
    }
    return value;
  }, [balance, positions, getPrice]);

  const totalPnL = useCallback(() => {
    const realized = trades
      .filter((t) => t.side === "sell" && t.status === "filled" && t.pnl != null)
      .reduce((sum, t) => sum + t.pnl, 0);

    let unrealized = 0;
    for (const pos of positions) {
      const price = getPrice(pos.assetId);
      if (price) {
        const mult = pos.positionType === "short" ? -1 : 1;
        unrealized += (price - pos.avgPrice) * pos.quantity * mult;
      }
    }

    return { realized, unrealized, total: realized + unrealized };
  }, [trades, positions, getPrice]);

  const getPositionPnL = useCallback(
    (positionId) => {
      const pos = positions.find((p) => p.id === positionId);
      if (!pos) return null;
      const price = getPrice(pos.assetId);
      if (!price) return null;
      const mult = pos.positionType === "short" ? -1 : 1;
      return {
        unrealized: (price - pos.avgPrice) * pos.quantity * mult,
        percentChange: ((price - pos.avgPrice) / pos.avgPrice) * 100 * mult,
        currentValue: price * pos.quantity,
      };
    },
    [positions, getPrice]
  );

  return {
    balance, positions, trades, pendingOrders, alerts,
    selectedAsset, setSelectedAsset,
    executeOrder, openShort, closePosition, cancelPendingOrder,
    resetAccount, portfolioValue, totalPnL, getPositionPnL,
    addAlert, removeAlert, lastTriggeredAlerts,
    clearTriggeredAlerts: () => setLastTriggeredAlerts([]),
    startingBalance, TRADING_FEE,
  };
}
