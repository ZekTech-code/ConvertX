import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { auth as firebaseAuth, isFirebaseEnabled } from "../services/firebase";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const [firebaseValidated, setFirebaseValidated] = useState(isFirebaseEnabled === false);

  useEffect(() => {
    if (!isFirebaseEnabled) return;

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      setFirebaseValidated(true);
    };

    // If Firebase never reports an auth state (network failure, invalid API
    // key, blocked token refresh) we must not render `null` forever.
    const timeout = setTimeout(settle, 6000);

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (firebaseUser) => {
        clearTimeout(timeout);
        if (!firebaseUser && isAuthenticated) {
          window.location.href = "/get-started";
          return;
        }
        settle();
      },
      () => {
        // Auth listener error (e.g. securetoken 400) — fall through to the
        // local session check instead of hanging on a blank screen.
        clearTimeout(timeout);
        settle();
      },
    );

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [isAuthenticated]);

  if (!firebaseValidated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/get-started" replace />;
  }

  return children;
}
