/**
 * ConvertX — JS mirror of the design tokens in `src/styles/theme.css`.
 *
 * Chart libraries (recharts, lightweight-charts) and inline SVG attributes
 * cannot consume Tailwind classes, so they read real hex/rgba values from
 * here. Keeping this file in sync with theme.css is the only bridge needed â€”
 * components never hardcode brand colours.
 */

/* Raw vivid blue ramp â€” stable across modes */
export const VIVID = {
  50: "#eef4ff",
  100: "#dbe7ff",
  200: "#bed4ff",
  300: "#92b8ff",
  400: "#5f93fb",
  500: "#3370f5",
  600: "#1b53e6",
  700: "#1442c2",
  800: "#16389b",
  900: "#173079",
  950: "#0d1c48",
};

/** Pick the value for the active theme. */
export const pick = (map, darkMode) => (darkMode ? map.dark : map.light);

/** Vivid blue â€” mode aware (brightens on dark surfaces, never inverted). */
export const ACCENT = { light: VIVID[600], dark: VIVID[400] };
export const ACCENT_HOVER = { light: VIVID[700], dark: VIVID[300] };
export const ACCENT_SOFT = { light: "rgba(27, 83, 230, 0.10)", dark: "rgba(95, 147, 251, 0.16)" };
export const ACCENT_RING = { light: "rgba(27, 83, 230, 0.40)", dark: "rgba(95, 147, 251, 0.55)" };
export const ACCENT_GLOW = { light: "rgba(27, 83, 230, 0.18)", dark: "rgba(95, 147, 251, 0.22)" };

/** Primary action fill â€” dark mode keeps white label text readable. */
export const PRIMARY = { light: VIVID[600], dark: "#2e6bf2" };
export const PRIMARY_HOVER = { light: VIVID[700], dark: "#4b85f8" };

/** Financial movement â€” semantic, never the brand accent. */
export const POSITIVE = { light: "#0f8f5e", dark: "#2dd4a7" };
export const NEGATIVE = { light: "#cf1b3c", dark: "#fb7185" };

/** Status */
export const SUCCESS = { light: "#0f8f5e", dark: "#34d399" };
export const WARNING = { light: "#b45309", dark: "#fbbf24" };
export const DANGER = { light: "#cf1b3c", dark: "#fb7185" };

/** Neutrals */
/* Neutrals — untinted. The vivid blue is reserved for buttons and
   interactive accents; cards and pages stay clean neutral surfaces. */
export const CANVAS = { light: "#f8fafc", dark: "#000000" };
export const SURFACE = { light: "#ffffff", dark: "rgba(255,255,255,0.05)" };
export const SURFACE_RAISED = { light: "#ffffff", dark: "#141414" };
export const SURFACE_MUTED = { light: "#f8fafc", dark: "rgba(0,0,0,0.35)" };
export const SURFACE_SUNKEN = { light: "#f1f5f9", dark: "rgba(0,0,0,0.25)" };
export const BORDER = { light: "#e2e8f0", dark: "rgba(255,255,255,0.10)" };
export const BORDER_STRONG = { light: "#cbd5e1", dark: "rgba(255,255,255,0.18)" };
export const TEXT = { light: "#1e293b", dark: "#ffffff" };
export const TEXT_SECONDARY = { light: "#64748b", dark: "#94a3b8" };
export const TEXT_MUTED = { light: "#94a3b8", dark: "#64748b" };

/**
 * Convenience bundle for chart configuration objects.
 * @param {boolean} darkMode
 */
export function chartTheme(darkMode) {
  const accent = pick(ACCENT, darkMode);
  return {
    accent,
    accentHover: pick(ACCENT_HOVER, darkMode),
    accentSoft: pick(ACCENT_SOFT, darkMode),
    primary: pick(PRIMARY, darkMode),
    positive: pick(POSITIVE, darkMode),
    negative: pick(NEGATIVE, darkMode),
    success: pick(SUCCESS, darkMode),
    warning: pick(WARNING, darkMode),
    danger: pick(DANGER, darkMode),
    text: pick(TEXT, darkMode),
    textSecondary: pick(TEXT_SECONDARY, darkMode),
    textMuted: pick(TEXT_MUTED, darkMode),
    border: pick(BORDER, darkMode),
    surface: pick(SURFACE, darkMode),
    surfaceMuted: pick(SURFACE_MUTED, darkMode),
    canvas: pick(CANVAS, darkMode),
  };
}

const ACCENT_RGB = { light: "27, 83, 230", dark: "95, 147, 251" };

/**
 * Translucent vivid blue for inline styles / canvas libraries.
 * @param {boolean} darkMode
 * @param {number} alpha 0â€“1
 */
export function accentAlpha(darkMode, alpha) {
  return `rgba(${pick(ACCENT_RGB, darkMode)}, ${alpha})`;
}

/** Translucent status colour for inline styles. */
export function statusAlpha(kind, darkMode, alpha) {
  const rgb = {
    positive: { light: "15, 143, 94", dark: "45, 212, 167" },
    negative: { light: "207, 27, 60", dark: "251, 113, 133" },
    warning: { light: "180, 83, 9", dark: "251, 191, 36" },
  }[kind];
  return `rgba(${pick(rgb, darkMode)}, ${alpha})`;
}

/** Label colour that sits on top of a vivid blue fill. */
export const ON_ACCENT = "#ffffff";

export default chartTheme;
