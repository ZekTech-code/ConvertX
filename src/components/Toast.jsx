import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { motion } from "framer-motion";

export default function Toast({ 
  show, 
  type = "success",
  variant = "modal",
  title, 
  message, 
  detail,
  onClose, 
  onConfirm, 
  confirmText = "Okay",
  showConfirm = true,
  autoClose = true,
  duration = 5000 
}) {
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

  if (isSuccess && !isToastVariant) {
    return createPortal(
      <motion.div
        key="success-modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/65 backdrop-blur-md" />
        <div className="relative w-full max-w-sm overflow-hidden bg-surface-raised border border-border rounded-3xl shadow-pop p-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full bg-success/20 blur-[60px] pointer-events-none" />

          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-success-soft text-success border border-success-border flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-black tracking-tight text-text">
              {title}
            </h3>
            <p className="mt-2 text-xs text-text-secondary leading-relaxed max-w-71.25">
              {message}
            </p>

            {showConfirm && (
              <button
                onClick={onConfirm || onClose}
                className="w-full mt-6 bg-primary text-on-primary font-bold py-3.5 rounded-xl hover:bg-primary-hover active:scale-[0.99] transition duration-200 cursor-pointer text-sm shadow-primary"
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

  if (isSuccess && isToastVariant) {
    return createPortal(
      <motion.div
        key="success-toast"
        initial={{ opacity: 0, x: 60, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: 60 }}
        className="fixed top-6 right-6 z-9999 w-full max-w-90 select-none"
      >
        <div className="w-full overflow-hidden bg-surface-raised/95 border border-success-border rounded-2xl shadow-pop backdrop-blur-md p-4 flex gap-3.5 relative">
          <div className="absolute top-0 left-0 w-24 h-24 rounded-full bg-success/10 blur-2xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-text-muted hover:text-text transition duration-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-success-soft text-success border border-success-border flex items-center justify-center shrink-0 relative z-10">
            <CheckCircle2 className="w-5 h-5" />
          </div>

          <div className="flex-1 pr-4 relative z-10">
            <h4 className="text-xs font-bold text-text uppercase tracking-wider">
              {title}
            </h4>
            <p className="mt-1 text-[11px] text-text-muted leading-normal">
              {message}
            </p>
            {detail?.rate !== undefined && (
              <p className="mt-1.5 text-[10px] text-text-muted font-mono">
                Rate 1 {detail.from} = {Number(detail.rate).toLocaleString()} {detail.to}
                {detail.reference && (
                  <span className="ml-2 text-text-muted/70">Ref {detail.reference}</span>
                )}
              </p>
            )}
          </div>
        </div>
      </motion.div>,
      document.body
    );
  }

  return createPortal(
    <motion.div
      key="error-toast"
      initial={{ opacity: 0, x: 50, y: -20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      className="fixed top-6 right-6 z-9999 w-full max-w-90 p-2 select-none"
    >
      <div className="w-full overflow-hidden bg-surface-raised/95 border border-danger-border rounded-2xl shadow-pop backdrop-blur-md p-4 flex gap-3.5 relative">
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-text-muted hover:text-text transition duration-200 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="w-10 h-10 rounded-xl bg-danger-soft text-danger border border-danger-border flex items-center justify-center shrink-0">
          <XCircle className="w-5 h-5" />
        </div>

        <div className="flex-1 pr-4">
          <h4 className="text-xs font-bold text-text uppercase tracking-wider">
            {title}
          </h4>
          <p className="mt-1 text-[11px] text-text-secondary leading-normal">
            {message}
          </p>
        </div>
      </div>
    </motion.div>,
    document.body
  );
}
