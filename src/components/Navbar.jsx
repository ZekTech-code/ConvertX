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
    { label: "Rates", onClick: () => go("/rates") },
    { label: "Trade", onClick: () => go("/trade") },
    { label: "Contact", onClick: () => scrollTo("contact") },
  ];

  return (
    <>
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 dark:border-white/10 backdrop-blur-xl bg-white/80 dark:bg-black/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <button onClick={() => go("/")} className="flex items-center gap-3 bg-transparent border-none cursor-pointer p-0">
          <div className="w-11 h-11 rounded-2xl bg-linear-to-r from-[#E88F2B] to-[#d97706] flex items-center justify-center text-black font-bold text-lg shadow-lg shadow-[#E88F2B]/30">
            <ConvertXIcon size={24} stroke="#000" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold tracking-wide text-gray-900 dark:text-white">ConvertX</h1>
            {isHome && <p className="text-xs text-gray-400">Secure Currency Platform</p>}
          </div>
        </button>

        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600 dark:text-gray-300">
          {navLinks.map((link) => (
            <motion.button
              key={link.label}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.94 }}
              onClick={link.onClick}
              className="relative group transition duration-300 hover:text-[#E88F2B] bg-transparent border-none cursor-pointer"
            >
              {link.label}
              <span className="absolute left-0 -bottom-1 h-0.5 w-0 bg-[#E88F2B] transition-all duration-300 group-hover:w-full" />
            </motion.button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className="w-11 h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-center hover:scale-105 transition cursor-pointer"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-700" />
            )}
          </button>

          {isAuthenticated && (
            <button
              onClick={() => go("/profile")}
              className="hidden md:flex w-9 h-9 rounded-full overflow-hidden shrink-0 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 items-center justify-center hover:scale-110 transition cursor-pointer"
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
            className="hidden md:block bg-linear-to-r from-[#E88F2B] to-[#d97706] text-black font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition duration-300 shadow-lg shadow-[#E88F2B]/20 cursor-pointer"
          >
            {isAuthenticated ? "Dashboard" : "Get Started"}
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-11 h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-center hover:border-[#E88F2B] transition duration-300 cursor-pointer"
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
          className="md:hidden border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#000000] px-6 py-6 space-y-5"
        >
          {navLinks.map((link) => (
            <motion.button
              key={link.label}
              type="button"
              whileTap={{ scale: 0.97, x: 6 }}
              onClick={link.onClick}
              className="block text-left w-full text-base font-medium hover:text-[#E88F2B] transition duration-300 bg-transparent border-none cursor-pointer"
            >
              {link.label}
            </motion.button>
          ))}

          <button
            onClick={() => go(isAuthenticated ? "/convert" : "/get-started")}
            className="w-full bg-linear-to-r from-[#E88F2B] to-[#d97706] text-black font-semibold py-3 rounded-xl cursor-pointer"
          >
            {isAuthenticated ? "Dashboard" : "Get Started"}
          </button>

          {isAuthenticated && (
            <button
              onClick={() => { setMenuOpen(false); logout(); }}
              className="w-full border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-rose-500 font-semibold py-3 rounded-xl cursor-pointer"
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
