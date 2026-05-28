import { createContext, useContext, useState, useEffect } from "react";
import { getMe, updateLastCheckedAt } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount — check if there's a token in localStorage.
  // If there is, verify it's still valid by calling /auth/me.
  // This keeps the user logged in across page refreshes.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    getMe()
      .then(setUser)
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  function login(token, userData) {
    localStorage.setItem("token", token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  // Called by the dashboard after it fetches jobs.
  // Updates lastCheckedAt so the "new since last visit" count
  // resets on the next visit.
  async function refreshLastCheckedAt() {
    try {
      const updated = await updateLastCheckedAt();
      setUser(updated);
    } catch (err) {
      console.error("Failed to update lastCheckedAt", err);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshLastCheckedAt }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — components call useAuth() instead of useContext(AuthContext)
export const useAuth = () => useContext(AuthContext);
