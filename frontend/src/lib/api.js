import axios from "axios";
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 30000,
});
export const errorText = (e) =>
  e?.response?.data?.message ||
  e?.message ||
  "Không thể hoàn tất yêu cầu. Vui lòng thử lại.";
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => {
    if (response.headers["x-session-idle-seconds"])
      window.dispatchEvent(new CustomEvent("crm:active-session"));
    if (
      ["post", "put", "patch", "delete"].includes(response.config.method) &&
      !response.config.url.startsWith("/auth/")
    )
      window.dispatchEvent(new CustomEvent("crm:data-changed"));
    return response;
  },
  (error) => {
    const path = error.config?.url || "";
    if (
      error.response?.status === 401 &&
      ![
        "/auth/login",
        "/auth/forgot-password",
        "/auth/reset-password",
        "/auth/register",
        "/auth/send-register-otp",
      ].includes(path)
    )
      window.dispatchEvent(new CustomEvent("crm:expired"));
    if (error.response?.status === 403)
      window.dispatchEvent(new CustomEvent("crm:permissions"));
    return Promise.reject(error);
  },
);
export const assetURL = (path) => {
  if (!path) return undefined;
  if (path.startsWith("data:")) return path;
  const base = import.meta.env.VITE_API_URL;
  return base?.startsWith("http")
    ? new URL(path, new URL(base).origin).href
    : path;
};
export const readJSON = (v, fallback = {}) => {
  if (v == null) return fallback;
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return fallback;
  }
};
export const money = (v) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
export const dateTime = (v) =>
  v
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(
        new Date(/Z$|[+]\d\d:\d\d$/.test(v) ? v : v.replace(" ", "T") + "Z"),
      )
    : "—";
export const dateOnly = (v) =>
  v
    ? new Intl.DateTimeFormat("vi-VN").format(
        new Date(v.slice(0, 10) + "T00:00:00"),
      )
    : "—";
export const options = (rows) =>
  rows.map((r) => ({
    value: r.id,
    label: r.name || r.full_name || r.company_name || r.title,
  }));
export async function download(path, params, filename) {
  const response = await api.get(path, { params, responseType: "arraybuffer" });
  const excel = /\.xlsx$/i.test(filename);
  if (excel) {
    const bytes = new Uint8Array(response.data);
    if (
      bytes.length < 4 ||
      bytes[0] !== 0x50 ||
      bytes[1] !== 0x4b ||
      bytes[2] !== 3 ||
      bytes[3] !== 4
    )
      throw new Error(
        "Máy chủ chưa trả về tệp Excel hợp lệ. Vui lòng thử lại hoặc kiểm tra lỗi backend.",
      );
  }
  const blob = new Blob([response.data], {
    type: excel
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : response.headers["content-type"] || "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return filename;
}
export async function upload(path, file, field = "file") {
  const body = new FormData();
  body.append(field, file);
  return (await api.post(path, body)).data;
}
