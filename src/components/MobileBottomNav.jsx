import { useNavigate, useLocation } from "react-router-dom";
import { Home, BarChart2, ArrowRightLeft, TrendingUp, User } from "lucide-react";
import { useTheme } from "../context/useTheme";

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
        background: darkMode ? "#000000" : "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.15)",
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
                    background: "linear-gradient(90deg, #E88F2B, #d97706)",
                    boxShadow: "0 0 10px rgba(232,143,43,0.6)",
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
                    ? "linear-gradient(135deg, rgba(232,143,43,0.18), rgba(217,119,6,0.18))"
                    : "transparent",
                  border: active
                    ? "1px solid rgba(232,143,43,0.25)"
                    : "1px solid transparent",
                  transition: "all 0.2s ease",
                  boxShadow: active ? "0 0 12px rgba(232,143,43,0.15)" : "none",
                }}
              >
                <Icon
                  size={18}
                  style={{
                    color: active ? "#E88F2B" : darkMode ? "#64748b" : "#94a3b8",
                    transition: "color 0.2s ease",
                  }}
                />
              </span>

              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: "0.02em",
                  color: active ? "#E88F2B" : darkMode ? "#64748b" : "#94a3b8",
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
