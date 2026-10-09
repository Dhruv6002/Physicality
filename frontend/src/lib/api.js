import axios from "axios";

const backendUrl =
  process.env.REACT_APP_BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://physicality.onrender.com"
    : "http://localhost:8000");
export const API = `${backendUrl.replace(/\/+$/, "")}/api`;

const api = axios.create({ baseURL: API, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pe_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (!err?.response && err?.message && !err?.isAxiosError && err?.code !== "ERR_NETWORK") {
    return err.message;
  }
  if (detail == null) {
    if (err?.code === "ERR_NETWORK" || !err?.response) {
      return "Could not reach the API. Check the backend URL, service availability, or network connection.";
    }
    return err?.message || "Something went wrong. Please try again.";
  }
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function fileUrl(path) {
  const token = localStorage.getItem("pe_token");
  return `${API}/files/${path}${token ? `?auth=${token}` : ""}`;
}

export function productImage(p) {
  if (p?.image_path) return fileUrl(p.image_path);
  return p?.image_url || "";
}

export default api;
