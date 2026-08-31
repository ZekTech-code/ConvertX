export const AVATARS = {
  avatar1: {
    label: "Developer",
    color: "bg-[#E88F2B]/10 border-[#E88F2B]/30 text-[#E88F2B]",
    svg: (className) => (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="#d97706" />
        <circle cx="50" cy="40" r="16" fill="white" fillOpacity="0.85" />
        <path d="M22 80C22 66.7 32.7 56 46 56H54C67.3 56 78 66.7 78 80V84H22V80Z" fill="white" fillOpacity="0.85" />
        <path d="M34 46L27 53L34 60" stroke="#E88F2B" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M66 46L73 53L66 60" stroke="#E88F2B" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  avatar2: {
    label: "Standard",
    color: "bg-slate-500/10 border-slate-500/30 text-slate-500",
    svg: (className) => (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="#64748B" />
        <circle cx="50" cy="40" r="18" fill="white" fillOpacity="0.9" />
        <path d="M20 80C20 66.7 30.7 56 44 56H56C69.3 56 80 66.7 80 80V84H20V80Z" fill="white" fillOpacity="0.9" />
      </svg>
    )
  },
  avatar3: {
    label: "Trader",
    color: "bg-pink-500/10 border-pink-500/30 text-pink-500",
    svg: (className) => (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="#EC4899" />
        <circle cx="50" cy="40" r="16" fill="white" fillOpacity="0.85" />
        <path d="M22 80C22 66.7 32.7 56 46 56H54C67.3 56 78 66.7 78 80V84H22V80Z" fill="white" fillOpacity="0.85" />
        <path d="M30 65L45 50L55 58L70 40" stroke="#F472B6" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M60 40H70V50" stroke="#F472B6" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  avatar4: {
    label: "Financier",
    color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500",
    svg: (className) => (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="#10B981" />
        <circle cx="50" cy="40" r="16" fill="white" fillOpacity="0.85" />
        <path d="M22 80C22 66.7 32.7 56 46 56H54C67.3 56 78 66.7 78 80V84H22V80Z" fill="white" fillOpacity="0.85" />
        <path d="M32 45H68M38 45V60M50 45V60M62 45V60M30 60H70" stroke="#34D399" strokeWidth="4" strokeLinecap="round" />
      </svg>
    )
  },
  avatar5: {
    label: "Arbitrageur",
    color: "bg-amber-500/10 border-amber-500/30 text-amber-500",
    svg: (className) => (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="#F59E0B" />
        <circle cx="50" cy="40" r="16" fill="white" fillOpacity="0.85" />
        <path d="M22 80C22 66.7 32.7 56 46 56H54C67.3 56 78 66.7 78 80V84H22V80Z" fill="white" fillOpacity="0.85" />
        <path d="M35 48C35 40 40 35 50 35C58 35 63 42 63 48" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
        <path d="M65 48C65 56 60 61 50 61C42 61 37 54 37 48" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
      </svg>
    )
  },
  avatar6: {
    label: "Executive",
    color: "bg-indigo-500/10 border-indigo-500/30 text-indigo-500",
    svg: (className) => (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="#6366F1" />
        <circle cx="50" cy="40" r="16" fill="white" fillOpacity="0.85" />
        <path d="M22 80C22 66.7 32.7 56 46 56H54C67.3 56 78 66.7 78 80V84H22V80Z" fill="white" fillOpacity="0.85" />
        <path d="M36 50H64V65H36V50Z" stroke="#818CF8" strokeWidth="4" strokeLinejoin="round" />
        <path d="M44 50V44H56V50" stroke="#818CF8" strokeWidth="4" strokeLinejoin="round" />
      </svg>
    )
  }
};
