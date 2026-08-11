export default function ConvertXIcon({ size = 16, className = "", stroke, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      <defs>
        <linearGradient id="cx-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E88F2B" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path
        d="M 436,416 L 236,96 A 160,160 0 0,0 236,416 L 436,96"
        stroke={stroke || "url(#cx-icon-grad)"}
        strokeWidth="72"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
