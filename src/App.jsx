import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import { WifiOff } from "lucide-react";
import useSecurity from "./hooks/useSecurity";

const CurrencyConverter = lazy(() => import("./components/CurrencyConverter"));
const Trade = lazy(() => import("./Pages/Trade"));
const CurrencyConverterHomePage = lazy(() => import("./Pages/Home"));
const ExchangeRate = lazy(() => import("./Pages/ExchangeRate"));
const GetStarted = lazy(() => import("./Pages/GetStarted"));
const Profile = lazy(() => import("./Pages/Profile"));

const MainApp = () => {
  useSecurity();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative z-99999 overflow-hidden select-none transition-colors duration-300 bg-canvas text-text">
        <div className="absolute top-[-10%] right-[-10%] w-112.5 h-112.5 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-112.5 h-112.5 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-md flex flex-col items-center p-8 rounded-3xl border border-border bg-surface text-text shadow-2xl transition-colors duration-300">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border bg-danger-soft border-danger-border text-danger transition-colors duration-300">
            <WifiOff className="w-10 h-10 animate-bounce" />
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2 font-sans text-text">
            No Internet Connection
          </h2>
          <p className="text-sm leading-relaxed mb-8 font-sans transition-colors duration-300 text-text-secondary">
            ConvertX requires an active internet connection to load and convert rates. Please verify your Wi-Fi or cellular network connection and try again.
          </p>
          <button
            onClick={() => {
              if (navigator.onLine) {
                setIsOffline(false);
              }
            }}
            className="w-full font-bold py-3.5 px-6 rounded-xl hover:scale-[1.02] active:scale-98 transition duration-200 cursor-pointer font-sans bg-primary hover:bg-primary-hover text-on-primary shadow-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-canvas text-text">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center animate-pulse shadow-primary">
                <span className="text-on-primary font-bold">CX</span>
              </div>
              <p className="text-sm text-text-secondary animate-pulse">Loading…</p>
            </div>
          </div>
        }
      >
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
        <Route
          path="/rates"
          element={
            <ProtectedRoute>
              <ExchangeRate />
            </ProtectedRoute>
          }
        />
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
      </Suspense>
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
