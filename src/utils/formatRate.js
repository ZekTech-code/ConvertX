export const formatRate = (value) => {
  if (!value) return "0";

  if (value >= 1000) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (value >= 1) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  });
};

export const formatPercent = (value) => {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
};

export const formatCurrency = (
  amount,
  currency
) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};