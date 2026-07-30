import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { motion } from "framer-motion";

export default function Toast({ 
  show, 
  type = "success",
  variant = "modal",   // "modal" | "toast"
  title, 
  message, 
  onClose, 
  onConfirm, 
  confirmText = "Okay",
  showConfirm = true,
  autoClose = true,
  duration = 5000 
}) {
  // Auto-close for error toasts, success toasts (variant="toast"), and success modals with no confirm button
  useEffect(() => {
    const shouldAutoClose =
      show &&
      autoClose &&
      (type !== "success" || variant === "toast" || !showConfirm);

    if (shouldAutoClose) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, autoClose, duration, type, variant, showConfirm, onClose]);

  if (!show) return null;

  const isSuccess = type === "success";
  const isToastVariant = variant === "toast";

  // ---------- SUCCESS MODAL (centered, full-overlay) ----------
  if (isSuccess && !isToastVariant) {
    return createPortal(
      <motion.div
        key="success-modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-md" />
        <div className="relative w-full max-w-sm overflow-hidden bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full bg-emerald-500/20 dark:bg-emerald-500/10 blur-[60px] pointer-events-none" />

          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/5">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">
              {title}
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[285px]">
              {message}
            </p>

            {showConfirm && (
              <button
                onClick={onConfirm || onClose}
                className="w-full mt-6 bg-linear-to-r from-[#E88F2B] to-[#d97706] hover:shadow-lg hover:shadow-[#E88F2B]/20 text-black font-extrabold py-3.5 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition duration-200 cursor-pointer text-sm shadow-md"
              >
                {confirmText}
              </button>
            )}
          </div>
        </div>
      </motion.div>,
      document.body
    );
  }

  // ---------- SUCCESS TOAST (slide-in corner, matching the current theme mode of the site) ----------
  if (isSuccess && isToastVariant) {
    return createPortal(
      <motion.div
        key="success-toast"
        initial={{ opacity: 0, x: 60, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: 60 }}
        className="fixed top-6 right-6 z-[9999] w-full max-w-[360px] select-none"
      >
        <div className="w-full overflow-hidden bg-white/95 dark:bg-[#000000]/98 border border-emerald-100 dark:border-emerald-500/25 rounded-2xl shadow-xl dark:shadow-2xl shadow-slate-200/50 dark:shadow-emerald-500/10 backdrop-blur-md p-4 flex gap-3.5 relative">
          {/* Glow blob */}
          <div className="absolute top-0 left-0 w-24 h-24 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[40px] pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white transition duration-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/25 flex items-center justify-center shrink-0 relative z-10">
            <CheckCircle2 className="w-5 h-5" />
          </div>

          <div className="flex-1 pr-4 relative z-10">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              {title}
            </h4>
            <p className="mt-1 text-[11px] text-slate-550 dark:text-slate-400 leading-normal">
              {message}
            </p>
          </div>
        </div>
      </motion.div>,
      document.body
    );
  }

  // ---------- ERROR TOAST (slide-in corner) ----------
  return createPortal(
    <motion.div
      key="error-toast"
      initial={{ opacity: 0, x: 50, y: -20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      className="fixed top-6 right-6 z-[9999] w-full max-w-[360px] p-2 select-none"
    >
      <div className="w-full overflow-hidden bg-white/90 dark:bg-black/95 border border-rose-200 dark:border-rose-500/20 rounded-2xl shadow-xl backdrop-blur-md p-4 flex gap-3.5 relative">
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-white transition duration-200 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0">
          <XCircle className="w-5 h-5" />
        </div>

        <div className="flex-1 pr-4">
          <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
            {title}
          </h4>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            {message}
          </p>
        </div>
      </div>
    </motion.div>,
    document.body
  );
}
