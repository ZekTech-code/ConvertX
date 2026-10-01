import { motion } from "framer-motion";
import ConvertXIcon from "./exchange/ConvertXIcon";

const dotVariants = {
  initial: { y: 0 },
  animate: (i) => ({
    y: [0, -14, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatDelay: 0.4,
      delay: i * 0.12,
      ease: "easeInOut",
    },
  }),
};

export default function PageLoader({ title = "Loading", subtitle = "Preparing your experience..." }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas text-text transition-colors duration-300 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-primary"
          >
            <ConvertXIcon size={32} stroke="#ffffff" />
          </motion.div>
        </div>

        <div className="text-center">
          <h2 className="text-lg font-black text-text tracking-wide">
            {title}
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              custom={i}
              variants={dotVariants}
              initial="initial"
              animate="animate"
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "var(--cx-accent)" }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
