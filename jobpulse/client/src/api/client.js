import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

// ── Request interceptor ───────────────────────────────────────────────────────
// Before every request, read the JWT from localStorage and attach it
// as an Authorization header. The server will use this to identify the user.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor ──────────────────────────────────────────────────────
// If any request gets a 401 (Unauthorized), the token has expired.
// Clear it and redirect to login so the user can sign in again.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default client;
