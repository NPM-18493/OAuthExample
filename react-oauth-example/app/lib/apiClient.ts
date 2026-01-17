import axios, { AxiosRequestConfig } from "axios";

const baseURL = (process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:5188").replace(/\/$/, "");

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Function to check if id token is expired
const isIdTokenExpired = (idToken: string): boolean => {
  try {
    const payloadBase64 = idToken.split(".")[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    const exp = payload.exp;
    if (typeof exp === "number") {
      const now = Math.floor(Date.now() / 1000);
      return now >= exp;
    }
    return true; // consider expired if no exp claim
  } catch {
    return true; // consider expired on any error
  }
};

// Function to fetch new id token using refresh token
const fetchNewIdToken = async (): Promise<string | null> => {
  try {
    const refreshToken = sessionStorage.getItem("refresh_token");
    if (!refreshToken) return null;

    const response = await api.post(
      "/refresh-token",
      new URLSearchParams({ refresh_token: refreshToken }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const data = response.data;
    const newIdToken = data.id_token || data.idToken || null;
    const newAccessToken = data.access_token || data.accessToken || null;
    const newRefreshToken = data.refresh_token || data.refreshToken || null;
    
    if (newIdToken) {
      sessionStorage.setItem("id_token", newIdToken);
    }
    if (newAccessToken) {
      sessionStorage.setItem("access_token", newAccessToken);
    }
    if (newRefreshToken) {
      sessionStorage.setItem("refresh_token", newRefreshToken);
    }
    
    return newIdToken;
  } catch {
    return null;
  }
};

api.interceptors.request.use(async (config: any) => {
  // build full URL for comparison (handles baseURL + relative url)
  const urlPart = config.url ?? "";
  const base = (config.baseURL ?? baseURL) as string;
  const fullUrl = `${base.replace(/\/$/, "")}${urlPart.startsWith("/") ? urlPart : `/${urlPart}`}`;

  // don't attach token for the code exchange endpoint
  if (fullUrl.includes("/exchange-code") || fullUrl.includes("/refresh-token")) return config;

  if (typeof window !== "undefined") {
    let idToken = sessionStorage.getItem("id_token");
    // checking if id token is expired
    if (idToken && isIdTokenExpired(idToken)) {
      idToken = await fetchNewIdToken();
      if (!idToken) {
        // If we couldn't get a new token, we should log out the user
        sessionStorage.removeItem("id_token");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");
        //window.location.href = "/login";
      }
    }

    if (idToken) {
      config.headers = { ...(config.headers ?? {}), Authorization: `Bearer ${idToken}` } as any;
    }
  }

  return config;
}, (error) => Promise.reject(error));

export default api;
