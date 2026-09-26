import { ChevronDown, Filter, Heart, MessageCircle, Share2, TrendingUp } from "lucide-react";

const CHART_W = 420;
const CHART_H = 150;

const CAMPAIGN_DATA = [18, 27, 23, 35, 31, 44, 39, 52, 47, 60, 56, 72];

const METRICS = [
  { label: "Total Spend", value: "$48.2K", delta: "+8.2%" },
  { label: "Total Clicks", value: "128.4K", delta: "+14.6%" },
  { label: "Conversions", value: "9,312", delta: "+21.3%" },
  { label: "ROAS", value: "4.8x", delta: "+0.6x" },
];

const PLATFORMS = [
  { id: "facebook", name: "Facebook", bg: "#1877F2" },
  { id: "instagram", name: "Instagram", bg: "#E4405F" },
  { id: "x", name: "X", bg: "#000000", ring: true },
  { id: "youtube", name: "YouTube", bg: "#FF0000" },
  { id: "linkedin", name: "LinkedIn", bg: "#0A66C2" },
];

const GRID_ROWS = [0.16, 0.38, 0.6, 0.82];
const AXIS_LABELS = ["Mar 1", "Mar 10", "Mar 20", "Mar 30"];

function buildSmoothPath(values) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;

  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * CHART_W,
    y: 14 + (1 - (v - min) / span) * (CHART_H - 28),
  }));

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const t = 0.18;

    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = p2.y - (p3.y - p1.y) * t;

    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return { d, last: points[points.length - 1] };
}

function glyphFor(id) {
  switch (id) {
    case "facebook":
      return <span className="text-[13px] font-black leading-none text-white">f</span>;
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="#fff" strokeWidth="2.2" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5.5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1.3" fill="#fff" stroke="none" />
        </svg>
      );
    case "x":
      return <span className="text-[11px] font-black leading-none text-white">X</span>;
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className="h-3 w-3.5" fill="#fff" aria-hidden="true">
          <path d="M9 6.4v11.2L19.2 12z" />
        </svg>
      );
    case "linkedin":
      return <span className="text-[9px] font-black leading-none tracking-tight text-white">in</span>;
    default:
      return null;
  }
}

export default function CampaignDashboardVisual() {
  const line = buildSmoothPath(CAMPAIGN_DATA);
  const area = `${line.d} L ${CHART_W} ${CHART_H} L 0 ${CHART_H} Z`;

  return (
    <div className="relative w-full max-w-md mx-auto lg:max-w-full" aria-hidden="true">
      <div className="relative rounded-3xl border border-white/10 bg-[#080d18] p-4 sm:p-5 md:p-6 shadow-[0_28px_64px_-28px_rgba(2,6,23,0.95)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <h3 className="text-sm sm:text-base font-bold text-white">Campaign Performance</h3>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-semibold text-slate-300">
            <Filter className="h-3 w-3 text-slate-400" />
            <span>Last 30 Days</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </div>
        </div>

        <div className="relative mt-4 pr-10 sm:mt-5 sm:pr-12">
          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4 xl:gap-3">
            {METRICS.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  {metric.label}
                </p>
                <p className="mt-1.5 text-lg font-black leading-none text-white tabular-nums">
                  {metric.value}
                </p>
                <p className="mt-1.5 text-[9px] font-bold text-emerald-400 tabular-nums">
                  {metric.delta}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 sm:mt-5">
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              className="h-auto w-full"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="cdvArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {GRID_ROWS.map((row) => (
                <line
                  key={row}
                  x1="0"
                  x2={CHART_W}
                  y1={row * CHART_H}
                  y2={row * CHART_H}
                  stroke="#ffffff"
                  strokeOpacity="0.06"
                  strokeWidth="1"
                />
              ))}

              <path d={area} fill="url(#cdvArea)" />
              <path
                d={line.d}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx={line.last.x} cy={line.last.y} r="5" fill="#080d18" />
              <circle cx={line.last.x} cy={line.last.y} r="2.75" fill="#60A5FA" />
            </svg>

            <div className="mt-1.5 flex justify-between text-[8.5px] font-medium text-slate-500">
              {AXIS_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>

          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 flex-col gap-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-1.5">
            {PLATFORMS.map((platform) => (
              <div
                key={platform.id}
                title={platform.name}
                className={`grid h-6 w-6 place-items-center rounded-lg sm:h-7 sm:w-7 ${
                  platform.ring ? "border border-white/15" : ""
                }`}
                style={{ backgroundColor: platform.bg }}
              >
                {glyphFor(platform.id)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-4 z-20 w-36 rounded-2xl border border-white/10 bg-[#0b1220]/90 p-2.5 shadow-2xl shadow-black/60 backdrop-blur-xl sm:-bottom-8 sm:-left-8 sm:w-52 sm:p-3">
        <div className="flex gap-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#2563EB]">
            <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none" aria-hidden="true">
              <path d="M9 25v-5a11 11 0 0 1 22 0v5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
              <rect x="5.5" y="22.5" width="7" height="12" rx="3.5" fill="#fff" />
              <rect x="27.5" y="22.5" width="7" height="12" rx="3.5" fill="#fff" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Sponsored
            </p>
            <p className="mt-0.5 truncate text-[11px] font-bold leading-snug text-white">
              AeroBuds Pro — 40% Off
            </p>
            <p className="text-[10px] font-semibold text-blue-400">From $29 today</p>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Heart className="h-3.5 w-3.5" />
            <MessageCircle className="h-3.5 w-3.5" />
            <Share2 className="h-3.5 w-3.5" />
          </div>
          <span className="rounded-md bg-blue-500 px-1.5 py-1 text-[9px] font-bold text-white">
            Shop Now
          </span>
        </div>
      </div>

      <div className="absolute -bottom-6 right-3 z-20 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1220]/90 px-2.5 py-2 shadow-2xl shadow-black/60 backdrop-blur-xl sm:-bottom-8 sm:right-5 sm:gap-3 sm:px-3.5 sm:py-2.5">
        <div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-sm font-black leading-none text-emerald-400 tabular-nums sm:text-lg">
              +320%
            </span>
          </div>
          <p className="mt-1 text-[9px] font-semibold text-slate-400 sm:text-[10px]">
            More Conversions
          </p>
        </div>

        <svg viewBox="0 0 64 28" className="h-auto w-8 sm:w-14" fill="none" aria-hidden="true">
          <path
            d="M2 23 L14 18 L26 20 L38 11 L50 13 L62 3"
            stroke="#34D399"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="62" cy="3" r="2.5" fill="#34D399" />
        </svg>
      </div>
    </div>
  );
}
