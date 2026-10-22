import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "../lib/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [expired, setExpired] = useState(false);
  const pending = useRef(null),
    lastActivity = useRef(Date.now()),
    timer = useRef(null);
  const clear = useCallback((isExpired = false) => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setSession(null);
    setExpired(isExpired);
    clearTimeout(timer.current);
  }, []);
  const refresh = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      setLoading(false);
      return null;
    }
    if (pending.current) return pending.current;
    pending.current = api
      .get("/auth/me")
      .then((r) => {
        setSession(r.data);
        localStorage.setItem("user", JSON.stringify(r.data.user));
        setExpired(false);
        return r.data;
      })
      .catch((e) => {
        if (e.response?.status === 401) clear(true);
        throw e;
      })
      .finally(() => {
        pending.current = null;
        setLoading(false);
      });
    return pending.current;
  }, [clear]);
  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);
  useEffect(() => {
    const activity = () => {
      lastActivity.current = Date.now();
    };
    const ended = () => clear(true);
    const active = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => clear(true), 30 * 60000);
    };
    const changed = () => refresh().catch(() => {});
    const focus = () => {
      if (localStorage.getItem("token")) refresh().catch(() => {});
    };
    window.addEventListener("keydown", activity);
    window.addEventListener("pointerdown", activity);
    window.addEventListener("crm:expired", ended);
    window.addEventListener("crm:active-session", active);
    window.addEventListener("crm:permissions", changed);
    window.addEventListener("focus", focus);
    const interval = setInterval(() => {
      if (
        localStorage.getItem("token") &&
        Date.now() - lastActivity.current < 5 * 60000
      )
        refresh().catch(() => {});
    }, 4 * 60000);
    return () => {
      clearInterval(interval);
      clearTimeout(timer.current);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("crm:expired", ended);
      window.removeEventListener("crm:active-session", active);
      window.removeEventListener("crm:permissions", changed);
      window.removeEventListener("focus", focus);
    };
  }, [clear, refresh]);
  const login = async (values) => {
    const { data } = await api.post("/auth/login", values);
    localStorage.setItem("token", data.token);
    return refresh();
  };
  const logout = async () => {
    await api.post("/auth/logout");
    clear();
  };
  const has = (...roles) =>
    session?.user.roles.some((r) => roles.includes(r)) || false;
  const can = (module, action = "read", record) => {
    const grants = (session?.grants?.[module] || []).filter(
      (g) => action === "read" || /^[FW]/.test(g.permission),
    );
    if (!grants.length) return false;
    if (!record) return true;
    if (
      grants.some((g) => g.role !== "Team Lead" && !g.permission.includes("*"))
    )
      return true;
    const owner = record.owner_id ?? record.created_by;
    if (Number(owner) === session.user.id) return true;
    if (grants.some((g) => g.role === "Team Lead"))
      return (
        session.managed_user_ids?.includes(Number(owner)) ||
        (module === "LEAD" &&
          !owner &&
          (!record.group_id ||
            session.managed_group_ids?.includes(record.group_id)))
      );
    return false;
  };
  return (
    <AuthContext.Provider
      value={{
        ...session,
        user: session?.user,
        loading,
        expired,
        refresh,
        login,
        logout,
        can,
        has,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
