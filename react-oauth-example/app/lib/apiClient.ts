import axios, { AxiosRequestConfig } from "axios";

const baseURL = (process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:5188").replace(/\/$/, "");

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config: any) => {
  // build full URL for comparison (handles baseURL + relative url)
  const urlPart = config.url ?? "";
  const base = (config.baseURL ?? baseURL) as string;
  const fullUrl = `${base.replace(/\/$/, "")}${urlPart.startsWith("/") ? urlPart : `/${urlPart}`}`;

  // don't attach token for the code exchange endpoint
  if (fullUrl.includes("/exchange-code")) return config;

  if (typeof window !== "undefined") {
    const idToken = sessionStorage.getItem("id_token");
    if (idToken) {
      config.headers = { ...(config.headers ?? {}), Authorization: `Bearer ${idToken}` } as any;
    }
  }

  return config;
}, (error) => Promise.reject(error));

export default api;
