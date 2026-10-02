import { useNavigate, useLocation } from "react-router-dom";
import { Home, BarChart2, ArrowRightLeft, TrendingUp, User } from "lucide-react";
import { useTheme } from "../context/useTheme";
import { ACCENT, accentAlpha, BORDER, pick, SURFACE_RAISED, TEXT_MUTED } from "../styles/colors";

export default function MobileBottomNav({ hideProfile = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useTheme();

  const navItems = [
    {
      id: "main-site",
      label: "Main Site",
      icon: Home,
      path: "/",
    },
    {
      id: "rates-feed",
      label: "Rates Feed",
      icon: BarChart2,
      path: "/rates",
    },
    {
      id: "convert",
      label: "Convert",
      icon: ArrowRightLeft,
      path: "/convert",
    },
    {
      id: "trade",
      label: "Trade",
      icon: TrendingUp,
      path: "/trade",
    },
    ...(!hideProfile
      ? [
          {
            id: "profile",
            label: "Profile",
            icon: User,
            path: "/profile",
          },
        ]
      : []),
  ];

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-999"
      style={{
        background: pick(SURFACE_RAISED, darkMode),
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid " + pick(BORDER, darkMode),
        boxShadow: darkMode ? "0 -8px 32px rgba(0,0,0,0.4)" : "0 -8px 32px rgba(0,0,0,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${navItems.length}, 1fr)`,
          padding: "6px 0 8px",
        }}
      >
        {navItems.map(({ id, label, icon: Icon, path, onClick }) => {
          const active = path ? isActive(path) : false;
          return (
            <button
              key={id}
              id={`mobile-nav-${id}`}
              onClick={onClick || (() => navigate(path))}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                padding: "8px 4px",
                background: "none",
                border: "none",
                cursor: "pointer",
                outline: "none",
                position: "relative",
                transition: "all 0.2s ease",
              }}
            >
              {active && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 28,
                    height: 3,
                    borderRadius: "0 0 4px 4px",
                    background: pick(ACCENT, darkMode),
                    boxShadow: `0 0 12px ${accentAlpha(darkMode, 0.55)}`,
                  }}
                />
              )}

              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: active
                    ? accentAlpha(darkMode, 0.16)
                    : "transparent",
                  border: active
                    ? `1px solid ${accentAlpha(darkMode, 0.32)}`
                    : "1px solid transparent",
                  transition: "all 0.2s ease",
                  boxShadow: active ? `0 0 14px ${accentAlpha(darkMode, 0.22)}` : "none",
                }}
              >
                <Icon
                  size={18}
                  style={{
                    color: active ? pick(ACCENT, darkMode) : pick(TEXT_MUTED, darkMode),
                    transition: "color 0.2s ease",
                  }}
                />
              </span>

              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: "0.02em",
                  color: active ? pick(ACCENT, darkMode) : pick(TEXT_MUTED, darkMode),
                  transition: "color 0.2s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
