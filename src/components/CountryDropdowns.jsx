import { useState, useEffect, useRef, useMemo } from "react";
import { Globe, ChevronDown, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { COUNTRIES } from "../utils/currencyData";

export function CountryFlagImage({ code, name = "", className = "" }) {
  if (!code) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={name}
      className={`w-5 h-3.5 object-cover shadow-xs shrink-0 ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}

export function CountryDropdown({ value, onChange, error, disabled, id = "country-dropdown" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setSearchQuery("");
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedCountry = useMemo(() => {
    return COUNTRIES.find((c) => c.name === value);
  }, [value]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES;
    return COUNTRIES.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (isOpen) setSearchQuery("");
          setIsOpen(!isOpen);
        }}
        className={`w-full pl-10 pr-10 py-3 rounded-xl bg-surface-muted border text-left text-sm outline-none transition disabled:opacity-50 cursor-pointer flex items-center justify-between gap-2.5 ${
          error
            ? "border-danger focus:border-danger focus:ring-1 focus:ring-danger/30"
            : isOpen
            ? "border-accent ring-1 ring-accent"
            : "border-border"
        } ${value ? "text-text" : "text-text-muted"}`}
      >
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
          {selectedCountry ? (
            <CountryFlagImage code={selectedCountry.code} name={selectedCountry.name} />
          ) : (
            <Globe className="w-4 h-4" />
          )}
        </span>

        <span className="truncate pr-2 font-medium">
          {value || "Select Country..."}
        </span>

        <ChevronDown
          className={`w-4 h-4 shrink-0 text-text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180 text-accent" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-border bg-surface-raised shadow-pop p-2 overflow-hidden flex flex-col"
          >
            <div className="relative mb-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                id={`${id}-search`}
                name={`${id}-search`}
                type="text"
                placeholder="Search country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-surface-muted border border-border text-text outline-none focus:border-accent transition"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((c) => {
                  const isSelected = c.name === value;
                  return (
                    <button
                      type="button"
                      key={c.code}
                      onClick={() => {
                        onChange(c.name);
                        setSearchQuery("");
                        setIsOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                        isSelected
                          ? "bg-accent/10 text-accent"
                          : "text-text hover:bg-surface-muted dark:hover:bg-white/5"
                      }`}
                    >
                      <CountryFlagImage code={c.code} name={c.name} />
                      <span className="truncate flex-1">{c.name}</span>
                      <span className="text-[10px] text-text-muted font-mono">
                        {c.dialCode}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-text-muted">
                  No countries found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DialCodeDropdown({ value, onChange, disabled, id = "dial-code-dropdown" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setSearchQuery("");
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedCountry = useMemo(() => {
    if (!value) return null;
    return COUNTRIES.find((c) => c.dialCode === value);
  }, [value]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES;
    const query = searchQuery.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.dialCode.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className="relative shrink-0 w-28" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (isOpen) setSearchQuery("");
          setIsOpen(!isOpen);
        }}
        className={`w-full pl-3 pr-8 py-3 rounded-xl bg-surface-muted border text-left text-sm outline-none transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 font-semibold text-text ${
          isOpen ? "border-accent ring-1 ring-accent" : "border-border"
        }`}
      >
        {selectedCountry && (
          <CountryFlagImage code={selectedCountry.code} name={selectedCountry.name} className="w-4 h-3 rounded-none" />
        )}
        <span className="text-xs font-mono tracking-tight">
          {value || "+1"}
        </span>

        <ChevronDown
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180 text-accent" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-56 rounded-2xl border border-border bg-surface-raised shadow-pop p-2 overflow-hidden flex flex-col"
          >
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
              <input
                id={`${id}-search`}
                name={`${id}-search`}
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7.5 pr-2.5 py-1.5 text-[11px] rounded-lg bg-surface-muted border border-border text-text outline-none focus:border-accent transition"
                autoFocus
              />
            </div>

            <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((c) => {
                  const isSelected = c.dialCode === value;
                  return (
                    <button
                      type="button"
                      key={`${c.code}-${c.dialCode}`}
                      onClick={() => {
                        onChange(c.dialCode);
                        setSearchQuery("");
                        setIsOpen(false);
                      }}
                      className={`w-full px-2 py-1.5 rounded-lg text-left text-[11px] font-bold flex items-center gap-2 transition cursor-pointer ${
                        isSelected
                          ? "bg-accent/10 text-accent"
                          : "text-text hover:bg-surface-muted dark:hover:bg-white/5"
                      }`}
                    >
                      <CountryFlagImage code={c.code} name={c.name} className="w-4 h-3 rounded-none" />
                      <span className="font-mono text-xs">{c.dialCode}</span>
                      <span className="text-[10px] text-text-muted font-semibold truncate flex-1 text-right">
                        {c.name}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-4 text-[10px] text-text-muted">
                  No match
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
