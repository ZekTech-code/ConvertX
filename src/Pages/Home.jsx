import {
  ArrowRightLeft,
  ShieldCheck,
  Landmark,
  Globe,
  BarChart3,
  Lock,
  Cloud,
  AlertCircle,
  Mail,
  MessageSquare,
  User,
  Send,
  Phone,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import MobileBottomNav from "../components/MobileBottomNav";
import Toast from "../components/Toast";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 25, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
};


export default function CurrencyConverterHomePage() {
  const [logoutToastVisible, setLogoutToastVisible] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("General Inquiry");
  const [contactMessage, setContactMessage] = useState("");
  const [contactErrors, setContactErrors] = useState({});
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccessVisible, setContactSuccessVisible] = useState(false);
  const [loginPromptToastVisible, setLoginPromptToastVisible] = useState(false);

  const { isAuthenticated } = useAuth();
  const features = [
    {
      title: 'Real-Time Exchange Rates',
      description:
        'Get accurate live currency conversion rates updated instantly from trusted financial sources.',
      icon: <BarChart3 className="w-9 h-9" />,
    },
    {
      title: 'Bank Rate Preview',
      description:
        'Compare live mid-market rates with estimated commercial bank spreads before converting.',
      icon: <Landmark className="w-9 h-9" />,
    },
    {
      title: 'Crypto Trading Dashboard',
      description:
        'Practice trading 50+ cryptocurrencies with a $10,000 virtual balance, candlestick charts, and real-time market data.',
      icon: <ArrowRightLeft className="w-9 h-9" />,
    },
    {
      title: 'Market Analytics',
      description:
        'Track exchange listings, volume, and rate history with interactive charts and community sentiment insights.',
      icon: <Globe className="w-9 h-9" />,
    },
  ];

  const currencies = [
    'USD',
    'EUR',
    'GBP',
    'NGN',
    'JPY',
    'CAD',
    'AUD',
    'CHF',
  ];

  const navigate = useNavigate();

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactErrors({});

    if (!isAuthenticated) {
      setLoginPromptToastVisible(true);
      return;
    }

    const errors = {};
    if (!contactName.trim()) {
      errors.name = "Full name is required.";
    }
    if (!contactEmail.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      errors.email = "Please enter a valid email address.";
    }
    if (!contactMessage.trim()) {
      errors.message = "Message content is required.";
    }

    if (Object.keys(errors).length > 0) {
      setContactErrors(errors);
      return;
    }

    setContactSubmitting(true);

    try {
      const nameVal = contactName.trim();
      const emailVal = contactEmail.trim().toLowerCase();
      const subjectVal = contactSubject;
      const messageVal = contactMessage.trim();

      // Save to database / local storage (wrapped in try/catch so permissions issues don't block email delivery)
      try {
        const { db, isFirebaseEnabled } = await import("../services/firebase");
        if (isFirebaseEnabled && db) {
          const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
          await addDoc(collection(db, "contacts"), {
            name: nameVal,
            email: emailVal,
            subject: subjectVal,
            message: messageVal,
            timestamp: serverTimestamp(),
          });
        } else {
          const mockContacts = JSON.parse(localStorage.getItem("mock_contacts") || "[]");
          mockContacts.push({
            name: nameVal,
            email: emailVal,
            subject: subjectVal,
            message: messageVal,
            timestamp: new Date().toISOString(),
          });
          localStorage.setItem("mock_contacts", JSON.stringify(mockContacts));
        }
      } catch (dbErr) {
        console.warn("Database write failed (e.g. Firebase permissions), proceeding with email send:", dbErr);
        // Fallback to mock local storage
        try {
          const mockContacts = JSON.parse(localStorage.getItem("mock_contacts") || "[]");
          mockContacts.push({
            name: nameVal,
            email: emailVal,
            subject: subjectVal,
            message: messageVal,
            timestamp: new Date().toISOString(),
          });
          localStorage.setItem("mock_contacts", JSON.stringify(mockContacts));
        } catch (lsErr) {
          console.error("Local storage fallback failed:", lsErr);
        }
      }

      // Send to FormSubmit email endpoint
      const emailResponse = await fetch(`https://formsubmit.co/ajax/${import.meta.env.VITE_CONTACT_EMAIL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          name: nameVal,
          email: emailVal,
          subject: subjectVal,
          message: messageVal,
          _subject: `New ConvertX Inquiry: ${subjectVal}`
        })
      });

      if (!emailResponse.ok) {
        throw new Error("Failed to send email via FormSubmit");
      }

      setContactSuccessVisible(true);
      setContactName("");
      setContactEmail("");
      setContactSubject("General Inquiry");
      setContactMessage("");
    } catch (err) {
      console.error("Error submitting contact message:", err);

      // Fallback: Attempt mailto link redirection if FormSubmit or network fails
      try {
        const mailtoUrl = `mailto:${import.meta.env.VITE_CONTACT_EMAIL}?subject=${encodeURIComponent(`New ConvertX Inquiry: ${contactSubject}`)}&body=${encodeURIComponent(`Name: ${contactName.trim()}\nEmail: ${contactEmail.trim()}\n\nMessage:\n${contactMessage.trim()}`)}`;
        window.location.href = mailtoUrl;
      } catch (mailtoErr) {
        console.error("Mailto fallback failed:", mailtoErr);
      }

      setContactSuccessVisible(true);
      setContactName("");
      setContactEmail("");
      setContactSubject("General Inquiry");
      setContactMessage("");
    } finally {
      setContactSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-white dark:bg-[#000000] text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
      {/* Background — solid black, no effects */}

      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 lg:py-28 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        {/* Left Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 border border-[#E88F2B]/30 dark:border-[#E88F2B]/30 bg-[#E88F2B]/10 dark:bg-[#E88F2B]/10 text-[#d97706] dark:text-[#f0a04b] px-4 py-2 rounded-full text-sm mb-6">
            <span>●</span>
            Trusted by Global Users
          </motion.div>

          <motion.h2 variants={itemVariants} className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6 text-slate-900 dark:text-white">
            Convert Currency
            <span className="block text-slate-900 dark:text-white">
              Securely & Instantly
            </span>
          </motion.h2>

          <motion.p variants={itemVariants} className="text-slate-700 dark:text-gray-300 text-lg leading-relaxed max-w-xl mb-8">
            A modern currency converter platform with live exchange rates,
            secure transactions, responsive design, and fast global
            performance for individuals and businesses.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/convert")}
              className="bg-linear-to-r from-[#E88F2B] to-[#d97706] text-black font-semibold px-7 py-4 rounded-2xl cursor-pointer hover:shadow-lg hover:shadow-[#E88F2B]/20 transition-all duration-300"
            >
              Start Converting
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/rates")}
              className="border border-slate-300 dark:border-white/15 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 backdrop-blur-xl px-7 py-4 rounded-2xl transition-all duration-300 cursor-pointer text-slate-800 dark:text-white"
            >
              View Exchange Rates
            </motion.button>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-6 mt-12 max-w-lg">
            <div>
              <h3 className="text-3xl font-bold text-[#E88F2B] dark:text-[#E88F2B]">180+</h3>
              <p className="text-slate-650 dark:text-gray-400 text-sm mt-1">Currencies Supported</p>
            </div>

            <div>
              <h3 className="text-3xl font-bold text-[#E88F2B] dark:text-[#E88F2B]">24/7</h3>
              <p className="text-slate-650 dark:text-gray-400 text-sm mt-1">Live Rate Updates</p>
            </div>

            <div>
              <h3 className="text-3xl font-bold text-[#E88F2B] dark:text-[#E88F2B]">99.9%</h3>
              <p className="text-slate-650 dark:text-gray-400 text-sm mt-1">Secure Infrastructure</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Converter Card */}
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="relative w-full max-w-md mx-auto lg:max-w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl p-4 sm:p-5 md:p-6 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Currency Converter</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  Fast and protected transactions
                </p>
              </div>

              <button
                onClick={() => navigate("/convert")}
                className="w-11 h-11 rounded-xl bg-linear-to-r from-[#E88F2B] to-[#d97706] flex items-center justify-center text-black font-bold text-xl cursor-pointer hover:scale-105 active:scale-95 transition duration-150"
              >
                <ArrowRightLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Amount
                </label>
                <input
                  type="number"
                  defaultValue="1000"
                  className="w-full min-w-0 bg-slate-100 dark:bg-black/35 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm sm:text-base font-bold font-mono outline-none focus:border-[#E88F2B] transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    From
                  </label>
                  <select className="w-full min-w-0 bg-slate-100 dark:bg-black/35 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#E88F2B] transition text-xs sm:text-sm font-bold cursor-pointer">
                    {currencies.map((currency) => (
                      <option key={currency} className="bg-white dark:bg-[#000000] text-slate-900 dark:text-white">{currency}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    To
                  </label>
                  <select className="w-full min-w-0 bg-slate-100 dark:bg-black/35 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#E88F2B] transition text-xs sm:text-sm font-bold cursor-pointer">
                    {currencies.map((currency) => (
                      <option key={currency} className="bg-white dark:bg-[#000000] text-slate-900 dark:text-white">{currency}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-black/20 border border-slate-300 dark:border-[#E88F2B]/25 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-slate-500 dark:text-gray-400 text-xs font-medium">Exchange Rate</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E88F2B] animate-pulse inline-block" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-mono">
                    1 USD = 0.9234 EUR
                  </p>
                </div>
                <div className="text-right">
                  <h4 className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">€923.45</h4>
                </div>
              </div>

              <button 
                onClick={() => navigate("/convert")}
                className="w-full bg-linear-to-r from-[#E88F2B] to-[#d97706] text-white font-bold py-3 rounded-xl hover:scale-[1.02] transition duration-300 shadow-xl shadow-[#E88F2B]/20 cursor-pointer text-sm"
              >
                Convert Now
              </button>
            </div>

            {/* Security Badges */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                <p className="text-[#E88F2B] dark:text-[#E88F2B] font-bold text-xs mb-0.5">256-bit SSL</p>
                <span className="text-[10px] text-slate-550 dark:text-slate-400">
                  Advanced Encryption
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                <p className="text-[#E88F2B] dark:text-[#E88F2B] font-bold text-xs mb-0.5">Protected API</p>
                <span className="text-[10px] text-slate-555 dark:text-slate-400">
                  Secure Data Requests
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-16 scroll-mt-24"
      >
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4">
            Powerful Features Built for Modern Finance
          </h2>
          <p className="text-slate-600 dark:text-gray-300 max-w-2xl mx-auto text-lg">
            Everything you need in a professional currency conversion
            application with speed, security, and performance.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 xl:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{
                y: -8,
                borderColor: "rgba(232,143,43, 0.4)",
                boxShadow: "0 10px 30px rgba(232,143,43, 0.06)",
              }}
              className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-7 transition-all duration-300 backdrop-blur-xl shadow-sm dark:shadow-none"
            >
              <div className="text-4xl mb-5 text-slate-700 dark:text-white">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-slate-600 dark:text-gray-400 leading-relaxed text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Security Section */}
      <section
        id="security"
        className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20 scroll-mt-24"
      >
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#E88F2B]/10 border border-[#E88F2B]/20 text-[#E88F2B] dark:text-[#E88F2B] px-4 py-2 rounded-full text-sm mb-6">
              Shielded Protection
            </div>

            <h2 className="text-4xl md:text-5xl font-black leading-tight mb-6">
              Enterprise-Level Security
            </h2>

            <p className="text-slate-600 dark:text-gray-300 text-lg leading-relaxed mb-8">
              Your transactions and personal information are secured using
              modern authentication systems, encrypted APIs, secure token
              management, and trusted cloud infrastructure.
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E88F2B]/10 flex items-center justify-center text-[#E88F2B] dark:text-[#E88F2B] text-xl">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">Encrypted Requests</h4>
                  <p className="text-slate-600 dark:text-gray-400 text-sm mt-1">
                    Secure HTTPS communication and protected exchange APIs.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E88F2B]/10 flex items-center justify-center text-[#E88F2B] dark:text-[#E88F2B] text-xl">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">Protected Accounts</h4>
                  <p className="text-slate-600 dark:text-gray-400 text-sm mt-1">
                    Multi-layer authentication and secure session management.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E88F2B]/10 flex items-center justify-center text-[#E88F2B] dark:text-[#E88F2B] text-xl">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">Cloud Reliability</h4>
                  <p className="text-slate-600 dark:text-gray-400 text-sm mt-1">
                    High uptime infrastructure for stable global performance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-4xl p-8 backdrop-blur-2xl shadow-lg dark:shadow-none">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold">Security Overview</h3>
              <span className="bg-[#E88F2B]/10 text-[#E88F2B] dark:text-[#E88F2B] px-4 py-2 rounded-full text-sm">
                Active
              </span>
            </div>

            <div className="space-y-5">
              <div className="bg-slate-50 dark:bg-[#000000] rounded-2xl p-5 border border-slate-200 dark:border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-slate-600 dark:text-gray-400">API Protection</p>
                  <span className="text-[#E88F2B] dark:text-[#E88F2B]">98%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "98%" }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="h-full bg-[#E88F2B] rounded-full"
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-[#000000] rounded-2xl p-5 border border-slate-200 dark:border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-slate-600 dark:text-gray-400">Server Stability</p>
                  <span className="text-[#E88F2B] dark:text-[#E88F2B]">99.9%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "99.9%" }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="h-full bg-[#E88F2B] rounded-full"
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-[#000000] rounded-2xl p-5 border border-slate-200 dark:border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-slate-600 dark:text-gray-400">Data Encryption</p>
                  <span className="text-[#E88F2B] dark:text-[#E88F2B]">256-bit</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="h-full bg-[#E88F2B] rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contact"
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 scroll-mt-24"
      >
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Contact ConvertX
          </h2>
          <p className="text-slate-600 dark:text-gray-400 text-sm sm:text-base mt-3 max-w-2xl mx-auto">
            Reach our support team for account, rate, and platform assistance.
          </p>
        </div>

        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden backdrop-blur-2xl grid grid-cols-1 md:grid-cols-5">
          {/* Left Column: Contact Info Panel */}
          <div className="md:col-span-2 bg-slate-50/50 dark:bg-white/[0.02] p-8 sm:p-10 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 flex flex-col justify-between gap-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-[#E88F2B]/10 border border-[#E88F2B]/20 text-[#E88F2B] dark:text-[#E88F2B] px-3 py-1.5 rounded-full text-xs font-semibold">
                <Mail className="w-3.5 h-3.5" /> Support Channel
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tight mb-3">Get in Touch</h3>
                <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed">
                  Have questions about conversion rates, secure API access, or transaction logs? Click any support channel below to contact us directly.
                </p>
              </div>

              <div className="pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-semibold uppercase tracking-wider">
                  Contact Support Channels
                </p>
                <div className="flex items-center gap-4">
                  {/* Email Channel */}
                  <a
                    href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL}`}
                    className="w-12 h-12 rounded-full bg-[#E88F2B]/10 dark:bg-[#E88F2B]/10 hover:bg-[#E88F2B] hover:text-black text-[#E88F2B] dark:text-[#E88F2B] flex items-center justify-center transition-all duration-300 shadow-md shadow-[#E88F2B]/5 hover:scale-110 cursor-pointer"
                    title="Send Email"
                  >
                    <Mail className="w-5 h-5" />
                  </a>

                  {/* WhatsApp Channel */}
                  <a
                    href={`https://wa.me/${import.meta.env.VITE_CONTACT_WHATSAPP}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-[#E88F2B]/10 dark:bg-[#E88F2B]/10 hover:bg-[#E88F2B] hover:text-white text-[#E88F2B] dark:text-[#E88F2B] flex items-center justify-center transition-all duration-300 shadow-md shadow-[#E88F2B]/5 hover:scale-110 cursor-pointer"
                    title="Chat on WhatsApp"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.906-6.99C16.654 1.876 14.18 1.84 11.54 1.84c-5.437 0-9.862 4.421-9.866 9.865-.001 1.701.445 3.36 1.293 4.825L1.91 22.097l5.882-1.543zm11.92-6.52c-.08-.13-.3-.21-.63-.375-.33-.165-1.95-.96-2.25-1.07-.3-.11-.52-.165-.74.165-.22.33-.85 1.07-1.04 1.29-.19.22-.38.24-.71.075-.33-.165-1.395-.515-2.658-1.64-1-.89-1.676-1.99-1.87-2.33-.2-.33-.02-.51.145-.67.15-.15.33-.38.495-.57.165-.19.22-.33.33-.55.11-.22.05-.41-.025-.575-.075-.165-.74-1.78-1.01-2.435-.26-.63-.53-.54-.74-.55-.19-.01-.41-.01-.63-.01-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71 0 1.6 1.16 3.15 1.32 3.37.16.22 2.29 3.5 5.55 4.9 1.08.46 1.8.69 2.42.89.84.27 1.6.23 2.2.14.67-.1 1.95-.8 2.22-1.57.28-.77.28-1.43.2-1.57z" />
                    </svg>
                  </a>

                  {/* Telephone Channel */}
                  <a
                    href={`tel:${import.meta.env.VITE_CONTACT_PHONE}`}
                    className="w-12 h-12 rounded-full bg-[#E88F2B]/10 dark:bg-[#E88F2B]/10 hover:bg-[#E88F2B] hover:text-white text-[#E88F2B] dark:text-[#E88F2B] flex items-center justify-center transition-all duration-300 shadow-md shadow-[#E88F2B]/5 hover:scale-110 cursor-pointer"
                    title="Call Support Line"
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-white/10 pt-6">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-455">
                <ShieldCheck className="w-4 h-4 text-[#E88F2B]" />
                <span>Your connection is 256-bit SSL encrypted.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="md:col-span-3 p-8 sm:p-10 flex flex-col justify-center min-h-[380px]">
            {contactSuccessVisible ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#E88F2B]/10 border border-[#E88F2B]/20 rounded-2xl p-8 text-center my-auto"
              >
                <div className="w-12 h-12 rounded-full bg-[#E88F2B]/20 flex items-center justify-center text-[#E88F2B] dark:text-[#E88F2B] text-2xl mx-auto mb-4 font-bold">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Message Dispatched</h3>
                <p className="text-slate-650 dark:text-gray-400 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                  Thank you! Your message has been sent to our email. We will reach out to you shortly.
                </p>
                <button
                  onClick={() => setContactSuccessVisible(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white px-6 py-3 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Send Another Message
                </button>
              </motion.div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isAuthenticated) {
                    setLoginPromptToastVisible(true);
                    return;
                  }
                  handleContactSubmit(e);
                }}
                className="space-y-5 my-auto"
                noValidate
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => {
                          setContactName(e.target.value);
                          if (e.target.value.trim()) setContactErrors(p => ({ ...p, name: "" }));
                        }}
                        className={`w-full bg-slate-50 dark:bg-black/20 border text-slate-900 dark:text-white rounded-xl pl-10 pr-4 py-3 text-xs outline-none transition ${
                          contactErrors.name
                            ? "border-rose-400 dark:border-rose-500 focus:border-rose-400"
                            : "border-slate-200 dark:border-white/10 focus:border-[#E88F2B] dark:focus:border-[#E88F2B]"
                        }`}
                        placeholder="John Doe"
                      />
                    </div>
                    {contactErrors.name && (
                      <p className="text-rose-500 text-[10px] mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {contactErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={contactEmail}
                        onChange={(e) => {
                          setContactEmail(e.target.value);
                          setContactErrors(p => ({ ...p, email: "" }));
                        }}
                        className={`w-full bg-slate-50 dark:bg-black/20 border text-slate-900 dark:text-white rounded-xl pl-10 pr-4 py-3 text-xs outline-none transition ${
                          contactErrors.email
                            ? "border-rose-400 dark:border-rose-500 focus:border-rose-400"
                            : "border-slate-200 dark:border-white/10 focus:border-[#E88F2B] dark:focus:border-[#E88F2B]"
                        }`}
                        placeholder="john@example.com"
                      />
                    </div>
                    {contactErrors.email && (
                      <p className="text-rose-500 text-[10px] mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {contactErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
                    Subject
                  </label>
                  <select
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-xs outline-none focus:border-[#E88F2B] dark:focus:border-[#E88F2B] transition cursor-pointer"
                  >
                    <option value="General Inquiry" className="bg-white dark:bg-[#000000] text-slate-900 dark:text-white">General Inquiry</option>
                    <option value="Technical Support" className="bg-white dark:bg-[#000000] text-slate-900 dark:text-white">Technical Support</option>
                    <option value="Feedback & Suggestions" className="bg-white dark:bg-[#000000] text-slate-900 dark:text-white">Feedback & Suggestions</option>
                    <option value="Partnership" className="bg-white dark:bg-[#000000] text-slate-900 dark:text-white">Partnership</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
                    Message
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500">
                      <MessageSquare className="w-4 h-4" />
                    </span>
                    <textarea
                      value={contactMessage}
                      onChange={(e) => {
                        setContactMessage(e.target.value);
                        if (e.target.value.trim()) setContactErrors(p => ({ ...p, message: "" }));
                      }}
                      rows={4}
                      className={`w-full bg-slate-50 dark:bg-black/20 border text-slate-900 dark:text-white rounded-xl pl-10 pr-4 py-3 text-xs outline-none transition resize-none ${
                        contactErrors.message
                          ? "border-rose-400 dark:border-rose-500 focus:border-rose-400"
                          : "border-slate-200 dark:border-white/10 focus:border-[#E88F2B] dark:focus:border-[#E88F2B]"
                      }`}
                      placeholder="Describe your request in detail..."
                    />
                  </div>
                  {contactErrors.message && (
                    <p className="text-rose-500 text-[10px] mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {contactErrors.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="w-full bg-linear-to-r from-[#E88F2B] to-[#d97706] text-white font-bold py-3.5 rounded-xl hover:scale-[1.01] active:scale-[0.99] transition duration-200 shadow-lg shadow-[#E88F2B]/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  {contactSubmitting ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="footer"
        className="relative z-10 border-t border-slate-200 dark:border-white/10 mt-10 pb-24 md:pb-10"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 flex flex-col items-center justify-center text-center gap-2">
          <div>
            <h3 className="text-2xl font-black bg-linear-to-r dark:from-[#E88F2B] dark:to-[#d97706] from-[#E88F2B] to-[#d97706] bg-clip-text text-transparent">
              ConvertX
            </h3>
            <p className="text-slate-650 dark:text-gray-400 text-sm mt-2">
              Secure global currency conversion platform.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav hideProfile={!isAuthenticated} />
      <Toast
        show={logoutToastVisible}
        type="success"
        title="Signing You Out"
        message="Your session is closing securely. See you next time."
        showConfirm={false}
        duration={1150}
        onClose={() => setLogoutToastVisible(false)}
      />
      <Toast
        show={loginPromptToastVisible}
        type="success"
        title="Authentication Required"
        message="Please sign in or register to submit support messages."
        confirmText="Sign In / Register"
        showConfirm={true}
        onConfirm={() => navigate("/get-started")}
        onClose={() => setLoginPromptToastVisible(false)}
      />
    </div>
  );
}
