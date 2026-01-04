"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../lib/apiClient";

type UserInfo = {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
};

export default function GoogleSignInPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Google implicit flow returns values in the hash (#!) fragment.
    const paramsString = (window.location.hash && window.location.hash.length > 1)
      ? window.location.hash.substring(1)
      : (window.location.search && window.location.search.length > 1)
        ? window.location.search.substring(1)
        : "";

    if (!paramsString) return;

    const params = Object.fromEntries(new URLSearchParams(paramsString));

    if (params.code) {
      setCode(params.code as string);
      // Clean the URL so the token is not visible in the address bar
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        // ignore
      }
    } else if (params.error) {
      setError(String(params.error));
    }
  }, []);

  useEffect(() => {
    if (!code) return;

    (async () => {
      try {
        // Getting token as part of PKCE flow using authorization code (via backend exchange)
        const formBody = new URLSearchParams({
          code,
          code_verifier: sessionStorage.getItem("code_verifier") || "",
        }).toString();

        const tokenRes = await api.post(
          "/exchange-code",
          formBody,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const tokenJson = tokenRes.data;
        const accessToken = tokenJson.access_token ?? tokenJson.accessToken ?? null;
        const idToken = tokenJson.id_token ?? tokenJson.idToken ?? null;
        if (!accessToken) {
          throw new Error("No access_token returned from backend");
        }

        sessionStorage.setItem("access_token", accessToken);
        sessionStorage.setItem("id_token", idToken || "");
        setAccessToken(accessToken);
        // navigate to weather page after receiving token
        router.push("/weather");
      } catch (e: any) {
        setError(e?.message || "Failed to fetch user info");
      }
    })();
  }, [code]);

  const buildAuthUrl = () => {
    const base = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_URI || "https://accounts.google.com/o/oauth2/v2/auth";
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    const redirect = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || "";
    const scope = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_SCOPE || "email profile";
    const responseType = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_RESPONSE_TYPE || "token";

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirect,
      response_type: responseType,
      scope,
      include_granted_scopes: "true",
      prompt: "consent",
    });

    return `${base}?${params.toString()}`;
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", padding: 24 }}>
      <h1>Google Sign-in</h1>

      {!accessToken && (
        <>
          <p>Click the button below to sign in with Google (opens same window).</p>
          <a href={buildAuthUrl()} style={{ padding: "8px 16px", background: "#1a73e8", color: "white", borderRadius: 6, textDecoration: "none" }}>
            Sign in with Google
          </a>
        </>
      )}

      {accessToken && !user && !error && <p>Signed in — fetching profile…</p>}

      {error && (
        <div style={{ color: "#b00020" }}>
          <strong>Error:</strong>
          <div>{error}</div>
        </div>
      )}

      {user && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          {user.picture && <img src={user.picture} alt={user.name || "Avatar"} style={{ width: 64, height: 64, borderRadius: 999 }} />}
          <div>
            <div style={{ fontWeight: 600 }}>{user.name}</div>
            <div style={{ color: "#666" }}>{user.email}</div>
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => {
                  setAccessToken(null);
                  setUser(null);
                }}
                style={{ padding: "6px 12px", borderRadius: 6 }}
              >
                Sign out (local)
              </button>
            </div>
          </div>
        </div>
      )}

      {accessToken && (
        <div style={{ marginTop: 12, maxWidth: 640, wordBreak: "break-all" }}>
          <label style={{ fontSize: 12, color: "#666" }}>Access token (masked):</label>
          <div style={{ background: "#f5f5f5", padding: 8, borderRadius: 6 }}>{accessToken.slice(0, 8)}…{accessToken.slice(-8)}</div>
        </div>
      )}
    </main>
  );
}
