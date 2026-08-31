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
      <path
        d="M 436,416 L 236,96 A 160,160 0 0,0 236,416 L 436,96"
        stroke={stroke || "#E88F2B"}
        strokeWidth="72"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
