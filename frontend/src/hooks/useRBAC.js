import { useAuth } from "../auth/AuthProvider";
const modules = {
  CUSTOMERS: "CUSTOMER",
  LEADS: "LEAD",
  PIPELINES: "DEAL",
  PRODUCTS: "CATEGORY",
  CATEGORIES: "CATEGORY",
  SALES_ORG: "CATEGORY",
  USERS: "USER_LOG",
  AUDIT_LOG: "USER_LOG",
};
export function useRBAC() {
  const auth = useAuth();
  return {
    role: auth.user?.roles?.[0],
    roles: auth.user?.roles || [],
    canAccess: (name) => auth.can(modules[name] || name),
    can: auth.can,
  };
}
