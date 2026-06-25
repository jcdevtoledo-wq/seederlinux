import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import {
  authApi,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
} from "@/lib/api/client";

export type AppRole = "admin_gap" | "operador_om" | "auditor";

interface UserRole {
  id: string;
  role: AppRole;
  orgSigla: string | null;
}

interface User {
  id: string;
  email: string;
  displayName: string | null;
  roles: UserRole[];
}

interface AuthState {
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const authCheckRef = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (authCheckRef.current) return;
    authCheckRef.current = true;

    const token = getAuthToken();
    if (token) {
      authApi
        .me()
        .then((userData: any) => {
          setUser(userData);
        })
        .catch(() => {
          clearAuthToken();
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
          setInitialized(true);
        });
    } else {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  async function login(email: string, password: string) {
    const result = await authApi.login(email, password);
    setAuthToken(result.token);
    setUser(result.user);
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore
    }
    clearAuthToken();
    setUser(null);
    window.location.href = "/login";
  }

  const roles = user?.roles.map((r) => r.role as AppRole) ?? [];

  const value: AuthState = {
    user,
    roles,
    loading,
    initialized,
    login,
    logout,
    hasRole: (r) => roles.includes(r),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
