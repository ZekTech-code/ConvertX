import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { useTheme } from "./context/useTheme";
import { AuthProvider } from "./context/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import { WifiOff } from "lucide-react";
import useSecurity from "./hooks/useSecurity";

import CurrencyConverter from "./components/CurrencyConverter";
import Trade from "./Pages/Trade";
import CurrencyConverterHomePage from "./Pages/Home";
import ExchangeRate from "./Pages/ExchangeRate";
import GetStarted from "./Pages/GetStarted";
import Profile from "./Pages/Profile";

const MainApp = () => {
  const { darkMode } = useTheme();
  useSecurity();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Dynamic class update on the outer wrapper if offline changes
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className={`min-h-screen w-full flex flex-col items-center justify-center p-6 relative z-99999 overflow-hidden select-none transition-colors duration-300 ${
        darkMode ? "bg-[#000000] text-slate-100" : "bg-white text-slate-800"
      }`}>
        {/* Soft background light blooms */}
        {darkMode ? (
          <>
            <div className="absolute top-[-10%] right-[-10%] w-112.5 h-112.5 bg-[#E88F2B]/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-112.5 h-112.5 bg-[#E88F2B]/10 rounded-full blur-[100px] pointer-events-none" />
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] right-[-10%] w-112.5 h-112.5 bg-rose-50 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-112.5 h-112.5 bg-slate-100 rounded-full blur-[100px] pointer-events-none" />
          </>
        )}

        <div className={`relative z-10 text-center max-w-md flex flex-col items-center p-8 rounded-3xl border shadow-2xl transition-colors duration-300 ${
          darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-100 text-slate-800"
        }`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border transition-colors duration-300 ${
            darkMode ? "bg-[#E88F2B]/10 border-[#E88F2B]/20 text-[#E88F2B]" : "bg-rose-50 border-rose-100 text-rose-500"
          }`}>
            <WifiOff className="w-10 h-10 animate-bounce" />
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2 font-sans">
            No Internet Connection
          </h2>
          <p className={`text-sm leading-relaxed mb-8 font-sans transition-colors duration-300 ${
            darkMode ? "text-slate-400" : "text-slate-500"
          }`}>
            ConvertX requires an active internet connection to load and convert rates. Please verify your Wi-Fi or cellular network connection and try again.
          </p>
          <button
            onClick={() => {
              if (navigator.onLine) {
                setIsOffline(false);
              }
            }}
            className={`w-full font-bold py-3.5 px-6 rounded-xl hover:scale-[1.02] active:scale-98 transition duration-200 cursor-pointer font-sans shadow-md ${
              darkMode ? "bg-linear-to-r from-[#E88F2B] to-[#d97706] hover:shadow-[#E88F2B]/20 text-black" : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CurrencyConverterHomePage />} />
        <Route
          path="/convert"
          element={
            <ProtectedRoute>
              <CurrencyConverter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/rates" element={<ExchangeRate />} />
        <Route
          path="/trade"
          element={
            <ProtectedRoute>
              <Trade />
            </ProtectedRoute>
          }
        />
        <Route path="/get-started" element={<GetStarted />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  return (
      <ThemeProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </ThemeProvider>
  );
};

export default App;