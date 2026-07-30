import { db as firebaseDb, isFirebaseEnabled } from "../services/firebase";
import {
  collection, addDoc, query, orderBy, limit as firestoreLimit,
  getDocs, deleteDoc, doc
} from "firebase/firestore";

/**
 * Generates a cryptographically secure random salt
 * @returns {string} Hexadecimal string
 */
export function generateSalt() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hashes a password with a salt using SHA-256 via Web Crypto API
 * @param {string} password 
 * @param {string} salt 
 * @returns {Promise<string>} Hexadecimal hash string
 */
export async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validates password strength and returns score + visual feedback
 * @param {string} password 
 * @returns {object} { score: number, label: string, color: string, feedback: string }
 */
export function validatePasswordStrength(password) {
  if (!password) {
    return { score: 0, label: "None", color: "bg-slate-300 dark:bg-white/10", feedback: "" };
  }

  let score = 0;
  const feedbackItems = [];

  if (password.length >= 8) {
    score += 1;
  } else {
    feedbackItems.push("At least 8 characters");
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedbackItems.push("One uppercase letter");
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedbackItems.push("One lowercase letter");
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedbackItems.push("One number");
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedbackItems.push("One special character");
  }

  let label = "Weak";
  let color = "bg-rose-500";
  if (score === 3) {
    label = "Medium";
    color = "bg-amber-500";
  } else if (score >= 4) {
    label = "Strong";
    color = "bg-emerald-500";
  }

  return {
    score,
    label,
    color,
    feedback: feedbackItems.length > 0 ? `Requires: ${feedbackItems.join(", ")}` : "Password meets security standards.",
  };
}

/**
 * Sanitizes input text to protect against XSS
 * @param {string} text 
 * @returns {string} Sanitized string
 */
export function sanitizeInput(text) {
  if (typeof text !== "string") return text;
  return text.replace(/<[^>]*>/g, "").trim();
}

function buildLogEntry(eventType, details, status) {
  let sessionIp = sessionStorage.getItem("secure_session_ip");
  if (!sessionIp) {
    const simulatedIps = ["102.89.34.120", "197.210.45.18", "192.168.1.100", "198.51.100.42"];
    sessionIp = simulatedIps[Math.floor(Math.random() * simulatedIps.length)];
    sessionStorage.setItem("secure_session_ip", sessionIp);
  }

  const userAgent = navigator.userAgent;
  let browser = "Web Client";
  if (userAgent.includes("Chrome")) browser = "Google Chrome";
  else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
  else if (userAgent.includes("Firefox")) browser = "Mozilla Firefox";
  else if (userAgent.includes("Edge")) browser = "Microsoft Edge";

  return {
    id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    eventType,
    details,
    ip: sessionIp,
    browser,
    status
  };
}

/**
 * Log a security event — stored in Firestore when Firebase is enabled, no-op otherwise
 */
export async function addSecurityLog(email, eventType, details = "", status = "SUCCESS") {
  if (!email) return;
  if (!isFirebaseEnabled || !firebaseDb) return;

  const logEntry = buildLogEntry(eventType, details, status);
  try {
    const logsRef = collection(firebaseDb, "users", email.toLowerCase(), "securityLogs");
    await addDoc(logsRef, logEntry);
  } catch (err) {
    console.error("Failed to write security log to Firestore:", err);
  }
}

/**
 * Retrieves security logs for a user from Firestore
 */
export async function getSecurityLogs(email) {
  if (!email || !isFirebaseEnabled || !firebaseDb) return [];
  try {
    const logsRef = collection(firebaseDb, "users", email.toLowerCase(), "securityLogs");
    const q = query(logsRef, orderBy("timestamp", "desc"), firestoreLimit(30));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

/**
 * Clears security logs for a user from Firestore
 */
export async function clearSecurityLogs(email) {
  if (!email || !isFirebaseEnabled || !firebaseDb) return;
  try {
    const logsRef = collection(firebaseDb, "users", email.toLowerCase(), "securityLogs");
    const snapshot = await getDocs(logsRef);
    await Promise.all(
      snapshot.docs.map((d) => deleteDoc(doc(firebaseDb, "users", email.toLowerCase(), "securityLogs", d.id)))
    );
  } catch (err) {
    console.error("Failed to clear security logs:", err);
  }
}

/**
 * Generates a mock developer API key
 * @returns {string} Simulated API token
 */
export function generateApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint32Array(32);
  window.crypto.getRandomValues(randomValues);
  let token = "cc_live_";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(randomValues[i] % chars.length);
  }
  return token;
}

/**
 * Maps common Firebase Auth error codes and messages to user-friendly text
 * @param {Error|object} err 
 * @returns {string} User-friendly error message
 */
export function getFriendlyAuthErrorMessage(err) {
  if (!err) return "An unknown error occurred.";
  const message = err.message || "";
  const code = err.code || "";
  
  if (code === "auth/email-already-in-use" || message.includes("email-already-in-use")) {
    return "This email address is already in use by another account.";
  }
  if (code === "auth/invalid-email" || message.includes("invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (code === "auth/weak-password" || message.includes("weak-password")) {
    return "The password is too weak. Please choose a stronger password.";
  }
  if (code === "auth/user-not-found" || message.includes("user-not-found")) {
    return "No account found with this email address.";
  }
  if (code === "auth/wrong-password" || message.includes("wrong-password") || code === "auth/invalid-credential" || message.includes("invalid-credential")) {
    return "Invalid email or password. Please try again.";
  }
  if (code === "auth/too-many-requests" || message.includes("too-many-requests")) {
    return "Too many failed attempts. Access to this account has been temporarily disabled. Please try again later.";
  }
  if (code === "auth/operation-not-allowed" || message.includes("operation-not-allowed")) {
    return "Email and password sign-in is disabled for this project. Please enable it in your authentication settings.";
  }
  if (message.includes("permissions") || message.includes("permission-denied")) {
    return "Database permission denied. Please verify your security rules are correctly deployed.";
  }
  
  return message.replace(/^Firebase:\s*/, "");
}

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 60 * 1000;

/**
 * Reads the current login attempt state for an email from localStorage.
 * Returns { count: number, lockUntil: number }.
 */
export async function getLoginAttempts(email) {
  if (!email) return { count: 0, lockUntil: 0 };
  try {
    const raw = localStorage.getItem(`login_attempts_${email.toLowerCase()}`);
    if (!raw) return { count: 0, lockUntil: 0 };
    const data = JSON.parse(raw);
    if (data.lockUntil && Date.now() > data.lockUntil) {
      localStorage.removeItem(`login_attempts_${email.toLowerCase()}`);
      return { count: 0, lockUntil: 0 };
    }
    return data;
  } catch {
    return { count: 0, lockUntil: 0 };
  }
}

/**
 * Records a failed login attempt in localStorage. Returns the updated { count, lockUntil }.
 */
export async function recordFailedLogin(email) {
  if (!email) return { count: 0, lockUntil: 0 };
  const emailKey = email.toLowerCase();
  const storageKey = `login_attempts_${emailKey}`;
  try {
    const data = await getLoginAttempts(email);

    if (data.lockUntil && Date.now() < data.lockUntil) {
      return data;
    }

    const newCount = data.count + 1;
    const newData = {
      count: newCount,
      lockUntil: newCount >= LOCKOUT_THRESHOLD ? Date.now() + LOCKOUT_DURATION_MS : 0,
    };
    localStorage.setItem(storageKey, JSON.stringify(newData));
    return newData;
  } catch {
    return { count: 0, lockUntil: 0 };
  }
}

/**
 * Clears the login attempt record after a successful login.
 */
export async function clearLoginAttempts(email) {
  if (!email) return;
  try {
    localStorage.removeItem(`login_attempts_${email.toLowerCase()}`);
  } catch {
    // best-effort cleanup
  }
}
