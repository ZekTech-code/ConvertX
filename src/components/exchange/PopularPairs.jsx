import { CURRENCY_INFO } from "../../utils/currencyData";

export default function PopularPairs({
  baseCurrency,
  selectedCurrency,
  onSelectPair,
}) {
  const popular = [
    "USD",
    "EUR",
    "GBP",
    "NGN",
    "JPY",
    "CAD",
    "AUD",
    "CHF",
  ];

  return (
    <section className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Popular Currency Pairs
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Quickly switch between commonly traded pairs
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {popular
            .filter((currency) => currency !== baseCurrency)
            .map((currency) => (
              <button
                key={currency}
                onClick={() => onSelectPair(currency)}
                className={`text-left p-5 rounded-2xl border transition-all duration-300 ${
                  selectedCurrency === currency
                    ? "border-[#E88F2B] bg-[#E88F2B]/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-[#E88F2B]/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {CURRENCY_INFO[currency]?.flag}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {baseCurrency}/{currency}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {CURRENCY_INFO[currency]?.name}
                    </p>
                  </div>
                </div>
              </button>
            ))}
        </div>
      </div>
    </section>
  );
}
