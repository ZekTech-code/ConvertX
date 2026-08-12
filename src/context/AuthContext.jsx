import { useState, useEffect, useRef, useCallback } from "react";
import {
  hashPassword,
  generateSalt,
  sanitizeInput,
  addSecurityLog,
  clearSecurityLogs,
  getFriendlyAuthErrorMessage,
  getLoginAttempts,
  recordFailedLogin,
  clearLoginAttempts
} from "../utils/security";
import {
  auth as firebaseAuth,
  db as firebaseDb,
  isFirebaseEnabled
} from "../services/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  checkActionCode,
  applyActionCode,
  signOut,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
  deleteUser as firebaseDeleteUser,
  onAuthStateChanged,
  reload as reloadFirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import {
  doc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  onSnapshot,
  disableNetwork,
  enableNetwork
} from "firebase/firestore";
import { AuthContext } from "./AuthContextValue";


const DEFAULT_BALANCES = {};
const DEFAULT_TRADING = { balance: 10000, startingBalance: 10000, positions: [], trades: [] };
const DEFAULT_PREFERENCES = {
  defaultFrom: "USD",
  defaultTo: "NGN",
  defaultAmount: 100,
  displayStyle: "code",
  decimalPlaces: 2,
  refreshRate: "manual",
  volatilityAlert: 1.0,
  chartRange: 30,
  pushNotifications: true,
  emailReports: false,
};

const isFirestoreNetworkError = (error) => {
  const code = error?.code || "";
  const message = error?.message?.toLowerCase() || "";

  return (
    code === "unavailable" ||
    message.includes("target id already exists") ||
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("internet")
  );
};

const buildEmailVerificationSettings = () => ({
  url: `${window.location.origin}/get-started`,
  handleCodeInApp: false
});

const buildPasswordResetSettings = () => ({
  url: `${window.location.origin}/get-started`,
  handleCodeInApp: false
});

const getEmailKey = (sessionUser) => sessionUser?.email?.toLowerCase();
const getPendingVerificationEmail = () => localStorage.getItem("pending_verification_email")?.toLowerCase() || "";

const getStoredAccountState = (sessionUser) => {
  const emailKey = getEmailKey(sessionUser);

  if (!emailKey) {
    return {
      balances: DEFAULT_BALANCES,
      conversions: [],
      apiKeys: [],
      is2FAEnabled: false,
      trading: DEFAULT_TRADING,
    };
  }

  const savedBalances = localStorage.getItem(`wallet_balances_${emailKey}`);
  const savedConversions = localStorage.getItem(`recent_conversions_${emailKey}`);
  const savedKeys = localStorage.getItem(`api_keys_${emailKey}`);
  const savedTrading = localStorage.getItem(`trading_state_${emailKey}`);

  return {
    balances: savedBalances ? JSON.parse(savedBalances) : DEFAULT_BALANCES,
    conversions: savedConversions ? JSON.parse(savedConversions) : [],
    apiKeys: savedKeys ? JSON.parse(savedKeys) : [],
    is2FAEnabled: localStorage.getItem(`is_2fa_enabled_${emailKey}`) === "true",
    trading: savedTrading ? JSON.parse(savedTrading) : DEFAULT_TRADING,
  };
};

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const isSigningUpRef = useRef(false);
  const isSigningInRef = useRef(false);
  const firestoreReconnectTimerRef = useRef(null);
  const initialFirebaseCheckDoneRef = useRef(false);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [balances, setBalances] = useState(DEFAULT_BALANCES);
  const [conversions, setConversions] = useState([]);
  const conversionsRef = useRef([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [trading, setTrading] = useState(DEFAULT_TRADING);
  const tradingRef = useRef(DEFAULT_TRADING);

  const applyAccountState = useCallback((accountState) => {
    setBalances(accountState.balances);
    conversionsRef.current = accountState.conversions;
    setConversions(accountState.conversions);
    setApiKeys(accountState.apiKeys);
    setIs2FAEnabled(accountState.is2FAEnabled);
    if (accountState.trading) {
      tradingRef.current = accountState.trading;
      setTrading(accountState.trading);
    }
  }, []);

  const applyStoredAccountState = useCallback((sessionUser) => {
    applyAccountState(getStoredAccountState(sessionUser));
  }, [applyAccountState]);

  const resetAccountState = useCallback(() => {
    applyAccountState({
      balances: DEFAULT_BALANCES,
      conversions: [],
      apiKeys: [],
      is2FAEnabled: false,
      trading: DEFAULT_TRADING,
    });
  }, [applyAccountState]);

  const buildCloudUserSession = useCallback((emailKey, data, fallback = {}) => {
    const fullName = data.name || fallback.name || data.signupName || fallback.signupName || "";
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    return {
      name: fullName,
      firstName: data.firstName || fallback.firstName || nameParts[0] || "",
      surname: data.surname || fallback.surname || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""),
      otherName: data.otherName || fallback.otherName || "",
      signupName: data.signupName || data.name || fallback.signupName || fallback.name || "",
      email: emailKey,
      phone: data.phone || fallback.phone || "",
      country: data.country || fallback.country || "",
      bio: data.bio || fallback.bio || "",
      avatar: data.avatar || fallback.avatar || "avatar1",
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...(fallback.preferences || {}),
        ...(data.preferences || {}),
      },
    };
  }, []);

  const getCloudAccountState = useCallback((data) => ({
    balances: data.balances || DEFAULT_BALANCES,
    conversions: Array.isArray(data.conversions) ? data.conversions : [],
    apiKeys: Array.isArray(data.apiKeys) ? data.apiKeys : [],
    is2FAEnabled: Boolean(data.is2FAEnabled),
    trading: data.trading || DEFAULT_TRADING,
  }), []);

  const applyCloudAccountData = useCallback((emailKey, data, fallback = {}) => {
    const userSession = buildCloudUserSession(emailKey, data, fallback);
    const accountState = getCloudAccountState(data);

    applyAccountState(accountState);
    setUser(userSession);
    setIsAuthenticated(true);

    return { userSession, accountState };
  }, [applyAccountState, buildCloudUserSession, getCloudAccountState]);

  const buildDefaultCloudProfile = useCallback((emailKey, fallback = {}) => {
    const fullName = fallback.name || fallback.signupName || emailKey;
    const nameParts = String(fullName).trim().split(/\s+/).filter(Boolean);
    const firstName = fallback.firstName || nameParts[0] || "";
    const surname = fallback.surname || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "");

    return {
      name: fullName,
      firstName,
      surname,
      otherName: fallback.otherName || "",
      signupName: fallback.signupName || fullName,
      email: emailKey,
      phone: fallback.phone || "",
      country: fallback.country || "",
      bio: fallback.bio || "",
      avatar: fallback.avatar || "avatar1",
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...(fallback.preferences || {}),
      },
      balances: DEFAULT_BALANCES,
      conversions: conversionsRef.current || [],
      apiKeys: [],
      is2FAEnabled: false,
      trading: tradingRef.current || DEFAULT_TRADING,
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };
  }, []);

  const applyOrCreateCloudProfile = useCallback(async (emailKey, fallback = {}) => {
    if (!isFirebaseEnabled || !firebaseDb) return null;

    try {
      const docRef = doc(firebaseDb, "users", emailKey);
      const docSnap = await getDocFromServer(docRef);

      if (!docSnap.exists()) {
        const profile = buildDefaultCloudProfile(emailKey, fallback);
        await setDoc(docRef, profile);
        applyCloudAccountData(emailKey, profile, fallback);
        return profile;
      }

      const data = docSnap.data();
      applyCloudAccountData(emailKey, data, fallback);
      return data;
    } catch (err) {
      if (isFirestoreNetworkError(err)) {
        scheduleFirestoreReconnect();
      } else {
        console.error("Cloud account load failed:", err);
      }
      return null;
    }
  }, [applyCloudAccountData, buildDefaultCloudProfile, scheduleFirestoreReconnect]);

  const clearFirestoreReconnectTimer = useCallback(() => {
    if (firestoreReconnectTimerRef.current) {
      window.clearTimeout(firestoreReconnectTimerRef.current);
      firestoreReconnectTimerRef.current = null;
    }
  }, []);

  const scheduleFirestoreReconnect = useCallback(() => {
    if (!isFirebaseEnabled || !firebaseDb || !navigator.onLine || firestoreReconnectTimerRef.current) {
      return;
    }

    firestoreReconnectTimerRef.current = window.setTimeout(() => {
      firestoreReconnectTimerRef.current = null;

      if (!navigator.onLine) return;

      enableNetwork(firebaseDb).catch(() => {
        disableNetwork(firebaseDb)
          .catch(() => {})
          .finally(() => {
            if (navigator.onLine) {
              enableNetwork(firebaseDb).catch(() => {});
            }
          });
      });
    }, 1500);
  }, []);

  const activateVerifiedFirebaseUser = useCallback(async (emailKey) => {
    const profile = await applyOrCreateCloudProfile(emailKey, {});
    if (!profile) {
      throw new Error("User record not found in Cloud Database.");
    }
    const { userSession } = applyCloudAccountData(emailKey, profile);
    localStorage.removeItem("pending_verification_email");
    return userSession;
  }, [applyCloudAccountData, applyOrCreateCloudProfile]);

  useEffect(() => {
    if (!isFirebaseEnabled || !firebaseDb) return;

    const handleOffline = () => {
      clearFirestoreReconnectTimer();
      disableNetwork(firebaseDb).catch(() => {});
    };
    const handleOnline = () => {
      clearFirestoreReconnectTimer();
      enableNetwork(firebaseDb).catch(() => {});
    };
    const handleConnectionChange = () => {
      if (!navigator.onLine) return;
      clearFirestoreReconnectTimer();
      enableNetwork(firebaseDb).catch(() => {
        disableNetwork(firebaseDb)
          .catch(() => {})
          .finally(() => {
            if (navigator.onLine) {
              enableNetwork(firebaseDb).catch(() => {});
            }
          });
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    if (navigator.connection) {
      navigator.connection.addEventListener("change", handleConnectionChange);
    }

    if (!navigator.onLine) {
      disableNetwork(firebaseDb).catch(() => {});
    }

    return () => {
      clearFirestoreReconnectTimer();
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (navigator.connection) {
        navigator.connection.removeEventListener("change", handleConnectionChange);
      }
    };
  }, [clearFirestoreReconnectTimer]);

  useEffect(() => {
    if (isFirebaseEnabled) {
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
        if (isSigningUpRef.current || isSigningInRef.current) {
          return;
        }
        if (firebaseUser) {
          initialFirebaseCheckDoneRef.current = true;
          const emailKey = firebaseUser.email.toLowerCase();
          if (!firebaseUser.emailVerified) {
            if (getPendingVerificationEmail() === emailKey) {
              resetAccountState();
              setUser(null);
              setIsAuthenticated(false);
              return;
            }
            resetAccountState();
            setUser(null);
            setIsAuthenticated(false);
            signOut(firebaseAuth).catch(() => {});
            return;
          }

          if (!user || user.email.toLowerCase() !== emailKey) {
            const basicSession = {
              name: firebaseUser.displayName || "",
              firstName: firebaseUser.displayName?.split(" ")[0] ?? "",
              surname: firebaseUser.displayName?.split(" ").slice(1).join(" ") ?? "",
              otherName: "",
              signupName: firebaseUser.displayName || "",
              email: emailKey,
              phone: firebaseUser.phoneNumber || "",
              country: "",
              bio: "",
              avatar: "avatar1",
              preferences: {
                defaultFrom: "USD",
                defaultTo: "NGN",
                defaultAmount: 100,
                displayStyle: "code",
                decimalPlaces: 2,
                refreshRate: "manual",
                volatilityAlert: 1.0,
                chartRange: 30,
                pushNotifications: true,
                emailReports: false,
              },
            };
            setUser(basicSession);
            setIsAuthenticated(true);
          }

          try {
            if (navigator.onLine) {
              await firebaseUser.getIdToken(true);
            }
            await applyOrCreateCloudProfile(emailKey, userRef.current || {});
          } catch {
          }
        } else {
          if (isAuthenticated && isFirebaseEnabled) {
            resetAccountState();
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [user, isAuthenticated, activateVerifiedFirebaseUser, applyCloudAccountData, applyOrCreateCloudProfile, resetAccountState]);

  useEffect(() => {
    if (!isFirebaseEnabled || !isAuthenticated || !user?.email) return;

    let cancelled = false;
    const emailKey = user.email.toLowerCase();
    const docRef = doc(firebaseDb, "users", emailKey);

    const syncFromCloud = async () => {
      if (!navigator.onLine || cancelled) return;
      await applyOrCreateCloudProfile(emailKey, userRef.current || {});
    };

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") {
        syncFromCloud();
      }
    };

    const buildSignature = (data) =>
      JSON.stringify([
        data.balances || null,
        data.conversions || null,
        data.apiKeys || null,
        Boolean(data.is2FAEnabled),
        data.trading || null,
        data.name || null,
        data.firstName || null,
        data.surname || null,
        data.phone || null,
        data.country || null,
        data.avatar || null,
        data.preferences || null,
      ]);

    let lastSignature = "";
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (cancelled) return;

        if (!snap.exists()) {
          syncFromCloud();
          return;
        }

        const data = snap.data();
        const signature = buildSignature(data);
        if (signature === lastSignature) return;

        lastSignature = signature;
        applyCloudAccountData(emailKey, data, userRef.current || {});
      },
      (error) => {
        if (isFirestoreNetworkError(error)) {
          scheduleFirestoreReconnect();
        } else {
          console.error("Cloud account listener error:", error);
        }
      }
    );

    syncFromCloud();
    window.addEventListener("online", syncFromCloud);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      cancelled = true;
      unsub();
      window.removeEventListener("online", syncFromCloud);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [applyCloudAccountData, applyOrCreateCloudProfile, isAuthenticated, scheduleFirestoreReconnect, user?.email]);

  const syncUserData = async (updates) => {
    if (!user) return;
    const emailKey = user.email.toLowerCase();

    if (updates.balances !== undefined) {
      setBalances(updates.balances);
    }
    if (updates.conversions !== undefined) {
      conversionsRef.current = updates.conversions;
      setConversions(updates.conversions);
    }
    if (updates.apiKeys !== undefined) {
      setApiKeys(updates.apiKeys);
    }
    if (updates.is2FAEnabled !== undefined) {
      setIs2FAEnabled(updates.is2FAEnabled);
    }
    if (updates.trading !== undefined) {
      tradingRef.current = updates.trading;
      setTrading(updates.trading);
    }
    if (updates.userProfile !== undefined) {
      const updatedUser = { ...user, ...updates.userProfile };
      setUser(updatedUser);
    }

    if (isFirebaseEnabled) {
      try {
        const docRef = doc(firebaseDb, "users", emailKey);
        const dataToSave = {};
        if (updates.balances !== undefined) dataToSave.balances = updates.balances;
        if (updates.conversions !== undefined) dataToSave.conversions = updates.conversions;
        if (updates.apiKeys !== undefined) dataToSave.apiKeys = updates.apiKeys;
        if (updates.is2FAEnabled !== undefined) dataToSave.is2FAEnabled = updates.is2FAEnabled;
        if (updates.trading !== undefined) dataToSave.trading = updates.trading;
        if (updates.userProfile !== undefined) {
          Object.assign(dataToSave, updates.userProfile);
        }

        await setDoc(docRef, dataToSave, { merge: true });
      } catch (err) {
        console.error("Failed to sync data to Cloud Database:", err);
      }
    }
  };

  const updateBalances = (newBalances) => syncUserData({ balances: newBalances });
  const updateApiKeys = (newApiKeys) => syncUserData({ apiKeys: newApiKeys });
  const set2FAEnabled = (enabled) => syncUserData({ is2FAEnabled: enabled });
  const updateTradingState = (newTrading) => syncUserData({ trading: newTrading });
  
  const addConversion = (conversion) => {
    const updated = [conversion, ...conversionsRef.current].slice(0, 50);
    conversionsRef.current = updated;
    return syncUserData({ conversions: updated });
  };

  const clearConversions = () => {
    return syncUserData({ conversions: [] });
  };

  const resendVerificationEmail = async (email, password) => {
    if (!isFirebaseEnabled) {
      throw new Error("Email verification is not configured.");
    }

    const sanitizedEmail = email.trim().toLowerCase();
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, sanitizedEmail, password);
      await reloadFirebaseUser(userCredential.user);

      if (userCredential.user.emailVerified) {
        return { success: true, alreadyVerified: true, email: sanitizedEmail };
      }

      await sendEmailVerification(userCredential.user, buildEmailVerificationSettings());
      localStorage.setItem("pending_verification_email", sanitizedEmail);
      addSecurityLog(sanitizedEmail, "Verification Email Sent", "Secure Firebase email verification link was resent.", "SUCCESS");
      return { success: true, email: sanitizedEmail };
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err), { cause: err });
    }
  };

  const requestPasswordReset = async (email) => {
    if (!isFirebaseEnabled) {
      throw new Error("Password reset is only available when Firebase Authentication is configured.");
    }

    const sanitizedEmail = email.trim().toLowerCase();
    if (!sanitizedEmail) {
      throw new Error("Enter your email address first.");
    }

    try {
      await sendPasswordResetEmail(firebaseAuth, sanitizedEmail, buildPasswordResetSettings());
      addSecurityLog(sanitizedEmail, "Password Reset Requested", "Password reset email was sent.", "SUCCESS");
      return { success: true, email: sanitizedEmail };
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err), { cause: err });
    }
  };

  const verifyEmailActionCode = useCallback(async (actionCode) => {
    if (!isFirebaseEnabled) {
      throw new Error("Email verification is not configured.");
    }

    try {
      const actionInfo = await checkActionCode(firebaseAuth, actionCode);
      const verifiedEmail = actionInfo?.data?.email?.toLowerCase() || "";

      await applyActionCode(firebaseAuth, actionCode);

      if (firebaseAuth.currentUser) {
        await reloadFirebaseUser(firebaseAuth.currentUser);

        await firebaseAuth.currentUser.getIdToken(true);
      }

      if (verifiedEmail) {
        await setDoc(doc(firebaseDb, "users", verifiedEmail), {
          emailVerified: true,
          emailVerifiedAt: new Date().toISOString()
        }, { merge: true });
        addSecurityLog(verifiedEmail, "Email Verified", "User email address was verified successfully.", "SUCCESS");
      }

      const currentEmail = firebaseAuth.currentUser?.email?.toLowerCase();
      if (currentEmail && firebaseAuth.currentUser?.emailVerified) {
        await activateVerifiedFirebaseUser(currentEmail);
        return { success: true, email: currentEmail, signedIn: true };
      }

      return { success: true, email: verifiedEmail, signedIn: false };
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err), { cause: err });
    }
  }, [activateVerifiedFirebaseUser]);

  const signUp = async (firstName, surname, otherName, email, password, phone = "", country = "") => {
    const sanitizedFirst = sanitizeInput(firstName);
    const sanitizedSurname = sanitizeInput(surname);
    const sanitizedOther = sanitizeInput(otherName);
    const fullName = `${sanitizedSurname} ${sanitizedFirst}${sanitizedOther ? " " + sanitizedOther : ""}`.trim();
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPhone = sanitizeInput(phone);
    const sanitizedCountry = sanitizeInput(country);

    if (isFirebaseEnabled) {
      isSigningUpRef.current = true;
      try {
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, sanitizedEmail, password);
        firebaseUpdateProfile(userCredential.user, { displayName: fullName }).catch(() => {});
        
        const defaultProfile = {
          name: fullName,
          firstName: sanitizedFirst,
          surname: sanitizedSurname,
          otherName: sanitizedOther,
          signupName: fullName,
          email: sanitizedEmail,
          phone: sanitizedPhone,
          country: sanitizedCountry,
          bio: "",
          avatar: "avatar1",
          preferences: {
            defaultFrom: "USD",
            defaultTo: "NGN",
            defaultAmount: 100,
            displayStyle: "code",
            decimalPlaces: 2,
            refreshRate: "manual",
            volatilityAlert: 1.0,
            chartRange: 30,
            pushNotifications: true,
            emailReports: false,
          },
          balances: DEFAULT_BALANCES,
          conversions: [],
          apiKeys: [],
          is2FAEnabled: false,
          trading: DEFAULT_TRADING,
          emailVerified: false,
          verificationSentAt: new Date().toISOString()
        };

        setDoc(doc(firebaseDb, "users", sanitizedEmail), defaultProfile).catch((err) => {
          console.error("[signUp] Failed to save profile to Cloud Database:", err);
        });
        sendEmailVerification(userCredential.user, buildEmailVerificationSettings()).catch((err) => {
          console.error("[signUp] Failed to send verification email:", err);
        });
        localStorage.setItem("pending_verification_email", sanitizedEmail);
      } catch (err) {
        console.error(
          `[signUp] Firebase error — code: "${err?.code}" | message: "${err?.message}"`
        );
        throw new Error(getFriendlyAuthErrorMessage(err), { cause: err });
      } finally {
        isSigningUpRef.current = false;
      }
    } else {
      const users = JSON.parse(localStorage.getItem("registered_users") || "[]");
      if (users.some((u) => u.email.toLowerCase() === sanitizedEmail)) {
        throw new Error("Email address already registered.");
      }

      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);

      const defaultProfile = {
        name: fullName,
        firstName: sanitizedFirst,
        surname: sanitizedSurname,
        otherName: sanitizedOther,
        signupName: fullName,
        email: sanitizedEmail,
        passwordHash,
        salt,
        phone: sanitizedPhone,
        country: sanitizedCountry,
        bio: "",
        avatar: "avatar1",
        preferences: {
          defaultFrom: "USD",
          defaultTo: "NGN",
          defaultAmount: 100,
          displayStyle: "code",
          decimalPlaces: 2,
          refreshRate: "manual",
          volatilityAlert: 1.0,
          chartRange: 30,
          pushNotifications: true,
          emailReports: false,
        }
      };

      users.push(defaultProfile);
      localStorage.setItem("registered_users", JSON.stringify(users));

      const userSession = {
        name: defaultProfile.name,
        firstName: defaultProfile.firstName,
        surname: defaultProfile.surname,
        otherName: defaultProfile.otherName,
        signupName: defaultProfile.signupName,
        email: defaultProfile.email,
        phone: defaultProfile.phone,
        country: defaultProfile.country,
        bio: defaultProfile.bio,
        avatar: defaultProfile.avatar,
        preferences: defaultProfile.preferences
      };

      localStorage.setItem(`wallet_balances_${sanitizedEmail}`, JSON.stringify(DEFAULT_BALANCES));
      localStorage.setItem(`recent_conversions_${sanitizedEmail}`, JSON.stringify([]));
      localStorage.setItem(`api_keys_${sanitizedEmail}`, JSON.stringify([]));
      localStorage.setItem(`is_2fa_enabled_${sanitizedEmail}`, "false");
      applyStoredAccountState(userSession);
      setUser(userSession);
      setIsAuthenticated(true);
    }

    addSecurityLog(sanitizedEmail, "Account Registered", "New secure account created successfully.", "SUCCESS");
    return {
      success: true,
      verificationRequired: isFirebaseEnabled,
      email: sanitizedEmail
    };
  };

  const signIn = async (email, password) => {
    const sanitizedEmail = email.trim().toLowerCase();

    let attemptsData = { count: 0, lockUntil: 0 };
    if (isFirebaseEnabled) {
      attemptsData = await getLoginAttempts(sanitizedEmail);
    }

    if (attemptsData.lockUntil && Date.now() < attemptsData.lockUntil) {
      const remaining = Math.ceil((attemptsData.lockUntil - Date.now()) / 1000);
      throw new Error(`Account locked. Try again in ${remaining}s.`);
    }

    if (isFirebaseEnabled) {
      isSigningInRef.current = true;
      try {
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, sanitizedEmail, password);
        if (!userCredential.user.emailVerified) {
          localStorage.setItem("pending_verification_email", sanitizedEmail);
          addSecurityLog(sanitizedEmail, "Email Verification Required", "User must verify email before secure access is granted.", "FAILED");
          return {
            success: false,
            verificationRequired: true,
            email: sanitizedEmail
          };
        }

        userCredential.user.getIdToken(true).catch(() => {});

        setUser(buildCloudUserSession(sanitizedEmail, {}, { name: userCredential.user.displayName || "" }));
        setIsAuthenticated(true);

        applyOrCreateCloudProfile(sanitizedEmail, { name: userCredential.user.displayName || "" });

        setDoc(doc(firebaseDb, "users", sanitizedEmail), { emailVerified: true }, { merge: true }).catch(() => {});

        clearLoginAttempts(sanitizedEmail).catch(() => {});
        addSecurityLog(sanitizedEmail, "Login Successful", "User logged in securely via Cloud Database.", "SUCCESS");
        return { success: true };
      } catch (err) {
        const isNetworkError =
          err?.code === "auth/network-request-failed" ||
          err?.message?.toLowerCase().includes("network") ||
          !navigator.onLine;

        if (isNetworkError) {
          isSigningInRef.current = false;
          throw new Error("Unable to reach Firebase. Please connect to the internet and sign in again so your account data can sync securely.", { cause: err });
        }

        const updated = await recordFailedLogin(sanitizedEmail);
        if (updated.count >= 5) {
          addSecurityLog(sanitizedEmail, "Account Locked", "Brute-force protection lockout triggered after 5 failed attempts.", "FAILED");
          throw new Error("Too many failed attempts. Account locked for 1 minute.", { cause: err });
        } else {
          addSecurityLog(sanitizedEmail, "Failed Login", "Invalid credentials submitted.", "FAILED");
          const friendlyMessage = getFriendlyAuthErrorMessage(err);
          throw new Error(`${friendlyMessage} (${5 - updated.count} attempts remaining)`, { cause: err });
        }
      } finally {
        isSigningInRef.current = false;
      }
    } else {
      const users = JSON.parse(localStorage.getItem("registered_users") || "[]");
      const foundUser = users.find((u) => u.email.toLowerCase() === sanitizedEmail);

      if (!foundUser) {
        attemptsData.count += 1;
        if (attemptsData.count >= 5) {
          attemptsData.lockUntil = Date.now() + 60 * 1000;
          addSecurityLog(sanitizedEmail, "Account Locked", "Brute-force protection lockout triggered after 5 failed attempts.", "FAILED");
          throw new Error("Too many failed attempts. Account locked for 1 minute.");
        } else {
          throw new Error(`Invalid email or password. (${5 - attemptsData.count} attempts remaining)`);
        }
      }

      let isPasswordCorrect = false;
      if (foundUser.passwordHash && foundUser.salt) {
        const testHash = await hashPassword(password, foundUser.salt);
        isPasswordCorrect = (testHash === foundUser.passwordHash);
      }

      if (!isPasswordCorrect) {
        attemptsData.count += 1;
        if (attemptsData.count >= 5) {
          addSecurityLog(sanitizedEmail, "Account Locked", "Brute-force protection lockout triggered after 5 failed attempts.", "FAILED");
          throw new Error("Too many failed attempts. Account locked for 1 minute.");
        } else {
          addSecurityLog(sanitizedEmail, "Failed Login", "Invalid credentials submitted.", "FAILED");
          throw new Error(`Invalid email or password. (${5 - attemptsData.count} attempts remaining)`);
        }
      }

      const userSession = {
        name: foundUser.name,
        firstName: foundUser.firstName || "",
        surname: foundUser.surname || "",
        otherName: foundUser.otherName || "",
        signupName: foundUser.signupName || foundUser.name || "",
        email: foundUser.email,
        phone: foundUser.phone || "",
        country: foundUser.country || "",
        bio: foundUser.bio || "",
        avatar: foundUser.avatar || "avatar1",
        preferences: foundUser.preferences || {
          defaultFrom: "USD",
          defaultTo: "NGN",
          defaultAmount: 100,
          displayStyle: "code",
          decimalPlaces: 2,
          refreshRate: "manual",
          volatilityAlert: 1.0,
          chartRange: 30,
          pushNotifications: true,
          emailReports: false,
        }
      };

      setUser(userSession);
      applyStoredAccountState(userSession);
      setIsAuthenticated(true);
      addSecurityLog(sanitizedEmail, "Login Successful", "User logged in securely.", "SUCCESS");
      return { success: true };
    }
  };

  const updateProfile = async (updatedData) => {
    if (!user) throw new Error("No authenticated user session.");

    const sanitizedData = { ...updatedData };
    if (updatedData.name !== undefined) sanitizedData.name = sanitizeInput(updatedData.name);
    if (updatedData.firstName !== undefined) sanitizedData.firstName = sanitizeInput(updatedData.firstName);
    if (updatedData.surname !== undefined) sanitizedData.surname = sanitizeInput(updatedData.surname);
    if (updatedData.otherName !== undefined) sanitizedData.otherName = sanitizeInput(updatedData.otherName);
    if (updatedData.phone !== undefined) sanitizedData.phone = sanitizeInput(updatedData.phone);
    if (updatedData.country !== undefined) sanitizedData.country = sanitizeInput(updatedData.country);
    if (updatedData.bio !== undefined) sanitizedData.bio = sanitizeInput(updatedData.bio);

    if (sanitizedData.firstName !== undefined || sanitizedData.surname !== undefined || sanitizedData.otherName !== undefined) {
      const fn = sanitizedData.firstName ?? user.firstName ?? "";
      const sn = sanitizedData.surname ?? user.surname ?? "";
      const on = sanitizedData.otherName ?? user.otherName ?? "";
      sanitizedData.name = `${sn} ${fn}${on ? " " + on : ""}`.trim();
    }

    const updatesToSync = { userProfile: sanitizedData };
    
    if (updatedData.preferences !== undefined) {
      updatesToSync.userProfile.preferences = {
        ...(user.preferences || {}),
        ...updatedData.preferences
      };
    }

    await syncUserData(updatesToSync);

    addSecurityLog(user.email, "Profile Updated", "User information updated and sanitized.", "SUCCESS");
    return { success: true };
  };

  const changePassword = async (oldPassword, newPassword) => {
    if (!user) throw new Error("No authenticated user session.");
    const emailKey = user.email.toLowerCase();

    if (isFirebaseEnabled) {
      try {
        if (firebaseAuth.currentUser) {
          await firebaseUpdatePassword(firebaseAuth.currentUser, newPassword);
        }
      } catch (err) {
        throw new Error(getFriendlyAuthErrorMessage(err), { cause: err });
      }
    }

    if (!isFirebaseEnabled) {
      const users = JSON.parse(localStorage.getItem("registered_users") || "[]");
      const userIndex = users.findIndex((u) => u.email.toLowerCase() === emailKey);

      if (userIndex !== -1) {
        const foundUser = users[userIndex];
        const salt = generateSalt();
        const passwordHash = await hashPassword(newPassword, salt);

        foundUser.passwordHash = passwordHash;
        foundUser.salt = salt;
        if (foundUser.password !== undefined) delete foundUser.password;

        localStorage.setItem("registered_users", JSON.stringify(users));
      }
    }

    addSecurityLog(user.email, "Password Changed", "Account password updated successfully.", "SUCCESS");
    return { success: true };
  };

  const logout = async () => {
    if (user) {
      addSecurityLog(user.email, "Logout Successful", "User logged out securely.", "SUCCESS");
    }
    if (isFirebaseEnabled) {
      try {
        await signOut(firebaseAuth);
      } catch (err) {
        console.error("Firebase sign out error:", err);
      }
    }
    setIsAuthenticated(false);
    setUser(null);
    resetAccountState();
  };

  const deleteAccount = async () => {
    if (!user) throw new Error("No authenticated user session.");
    const sanitizedEmail = user.email.toLowerCase();

    if (isFirebaseEnabled) {
      try {
        const docRef = doc(firebaseDb, "users", sanitizedEmail);
        await deleteDoc(docRef);

        if (firebaseAuth.currentUser) {
          await firebaseDeleteUser(firebaseAuth.currentUser);
        }
      } catch (err) {
        console.error("Firebase account deletion error:", err);
      }
    }

    clearSecurityLogs(sanitizedEmail);

    setIsAuthenticated(false);
    setUser(null);
    resetAccountState();

    return { success: true };
  };

  const signInWithGoogle = async () => {
    if (!isFirebaseEnabled) {
      throw new Error("Google Sign-In is not available without Firebase configuration.");
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    isSigningInRef.current = true;
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      const firebaseUser = result.user;
      const emailKey = firebaseUser.email.toLowerCase();

      firebaseUser.getIdToken(true).catch(() => {});

      setUser(buildCloudUserSession(emailKey, {}, { name: firebaseUser.displayName || "" }));
      setIsAuthenticated(true);

      applyOrCreateCloudProfile(emailKey, { name: firebaseUser.displayName || "" });

      addSecurityLog(emailKey, "Google Sign-In", "User authenticated via Google OAuth.", "SUCCESS");
      return { success: true };
    } catch (err) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        return { success: false, cancelled: true };
      }
      throw new Error(getFriendlyAuthErrorMessage(err), { cause: err });
    } finally {
      isSigningInRef.current = false;
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      balances,
      conversions,
      apiKeys,
      is2FAEnabled,
      trading,
      tradingRef,
      signUp,
      signIn,
      signInWithGoogle,
      requestPasswordReset,
      resendVerificationEmail,
      verifyEmailActionCode,
      updateProfile,
      changePassword,
      logout,
      deleteAccount,
      updateBalances,
      addConversion,
      clearConversions,
      updateApiKeys,
      set2FAEnabled,
      updateTradingState
    }}>
      {children}
    </AuthContext.Provider>
  );
}
