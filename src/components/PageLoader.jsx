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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#000000] transition-colors duration-300 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-[#E88F2B]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-[#E88F2B]/8 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl bg-linear-to-r from-[#E88F2B] to-[#d97706] flex items-center justify-center shadow-lg shadow-[#E88F2B]/30"
          >
            <ConvertXIcon size={32} stroke="#000" />
          </motion.div>
        </div>

        {/* Text */}
        <div className="text-center">
          <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-wide">
            {title}
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {subtitle}
          </p>
        </div>

        {/* Waving dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              custom={i}
              variants={dotVariants}
              initial="initial"
              animate="animate"
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "linear-gradient(135deg, #E88F2B, #d97706)" }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
