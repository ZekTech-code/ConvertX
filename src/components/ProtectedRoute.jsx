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

    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      if (!firebaseUser && isAuthenticated) {
        window.location.href = "/get-started";
        return;
      }
      setFirebaseValidated(true);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  if (!firebaseValidated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/get-started" replace />;
  }

  return children;
}
