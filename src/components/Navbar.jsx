import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/useTheme";
import { useAuth } from "../context/useAuth";
import { AVATARS } from "../Data/avatars.jsx";
import ConvertXIcon from "./exchange/ConvertXIcon";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = location.pathname === "/";

  // Routes that have a dedicated page get a persistent active state in the header
  const isActiveRoute = (path) => location.pathname.startsWith(path);

  const scrollTo = (id) => {
    setMenuOpen(false);
    if (isHome) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      navigate(`/#${id}`);
    }
  };

  const go = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const navLinks = [
    { label: "Features", onClick: () => scrollTo("features") },
    { label: "Security", onClick: () => scrollTo("security") },
    { label: "Rates", path: "/rates", onClick: () => go("/rates") },
    { label: "Trade", path: "/trade", onClick: () => go("/trade") },
    { label: "Contact", onClick: () => scrollTo("contact") },
  ];

  return (
    <>
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-surface/80 dark:bg-canvas/80 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <button onClick={() => go("/")} className="flex items-center gap-3 bg-transparent border-none cursor-pointer p-0">
          <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-on-primary font-bold text-lg shadow-primary">
            <ConvertXIcon size={24} stroke="#ffffff" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold tracking-wide text-text">ConvertX</h1>
            {isHome && <p className="text-xs text-text-muted">Secure Currency Platform</p>}
          </div>
        </button>

        <nav className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
          {navLinks.map((link) => (
            <motion.button
              key={link.label}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.94 }}
              onClick={link.onClick}
              aria-current={link.path && isActiveRoute(link.path) ? "page" : undefined}
              className={`relative group transition duration-200 bg-transparent border-none cursor-pointer ${
                link.path && isActiveRoute(link.path)
                  ? "text-accent font-semibold"
                  : "text-text-secondary hover:text-accent"
              }`}
            >
              {link.label}
              <span
                className={`absolute left-0 -bottom-1 h-0.5 rounded-full bg-accent transition-all duration-300 ${
                  link.path && isActiveRoute(link.path) ? "w-full" : "w-0 group-hover:w-full"
                }`}
              />
            </motion.button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className="w-11 h-11 rounded-xl border border-border bg-surface-raised flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent hover:bg-accent-soft active:scale-95 transition cursor-pointer"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-warning" />
            ) : (
              <Moon className="w-5 h-5 text-text" />
            )}
          </button>

          {isAuthenticated && (
            <button
              onClick={() => go("/profile")}
              className="hidden md:flex w-9 h-9 rounded-full overflow-hidden shrink-0 border border-border bg-surface-raised items-center justify-center hover:scale-110 transition cursor-pointer"
            >
              {user?.avatar?.startsWith("data:image/") ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                AVATARS[user?.avatar || "avatar1"]?.svg("w-full h-full") || null
              )}
            </button>
          )}

          <button
            onClick={() => go(isAuthenticated ? "/convert" : "/get-started")}
            className="hidden md:block bg-primary text-on-primary font-semibold px-5 py-2.5 rounded-xl hover:bg-primary-hover active:scale-95 transition duration-200 shadow-primary cursor-pointer"
          >
            {isAuthenticated ? "Dashboard" : "Get Started"}
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-11 h-11 rounded-xl border border-border bg-surface-raised flex items-center justify-center text-text hover:border-accent hover:text-accent transition duration-200 cursor-pointer"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="md:hidden border-t border-border bg-surface px-6 py-6 space-y-5 shadow-pop"
        >
          {navLinks.map((link) => (
            <motion.button
              key={link.label}
              type="button"
              whileTap={{ scale: 0.97, x: 6 }}
              onClick={link.onClick}
              aria-current={link.path && isActiveRoute(link.path) ? "page" : undefined}
              className={`block text-left w-full text-base font-medium transition duration-200 bg-transparent border-none cursor-pointer ${
                link.path && isActiveRoute(link.path)
                  ? "text-accent font-semibold"
                  : "text-text hover:text-accent"
              }`}
            >
              {link.label}
            </motion.button>
          ))}

          <button
            onClick={() => go(isAuthenticated ? "/convert" : "/get-started")}
            className="w-full bg-primary text-on-primary font-semibold py-3 rounded-xl hover:bg-primary-hover active:scale-[0.99] transition duration-200 cursor-pointer"
          >
            {isAuthenticated ? "Dashboard" : "Get Started"}
          </button>

          {isAuthenticated && (
            <button
              onClick={() => { setMenuOpen(false); logout(); }}
              className="w-full border border-danger-border text-danger hover:bg-danger-soft font-semibold py-3 rounded-xl transition duration-200 cursor-pointer"
            >
              Sign Out
            </button>
          )}
        </motion.div>
      )}
    </motion.header>
    <div className="h-19" />
    </>
  );
}
