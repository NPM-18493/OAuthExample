"use client";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      if (!sessionStorage.getItem("id_token")) {

        // Proper PKCE generation: base64url-encode verifier and challenge
        const base64UrlEncode = (buffer: ArrayBuffer | Uint8Array) => {
          const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        };

        const generateCodeVerifier = (length = 64) => {
          const array = new Uint8Array(length);
          crypto.getRandomValues(array);
          return base64UrlEncode(array);
        };

        const generateCodeChallenge = async (verifier: string) => {
          const data = new TextEncoder().encode(verifier);
          const digest = await crypto.subtle.digest('SHA-256', data);
          return base64UrlEncode(digest);
        };

        const code_verifier = generateCodeVerifier();
        const code_challenge = await generateCodeChallenge(code_verifier);

        sessionStorage.setItem("code_verifier", code_verifier);

        // Validate required env variables and build URL safely
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
        const oauthUri = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_URI ?? '';
        const responseType = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_RESPONSE_TYPE ?? 'code';
        const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ?? window.location.origin;
        const scope = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_SCOPE ?? 'openid profile email';

        if (!clientId) {
          console.error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID - cannot start OAuth flow');
          return;
        }
        if (!oauthUri) {
          console.error('Missing NEXT_PUBLIC_GOOGLE_OAUTH_URI - cannot start OAuth flow');
          return;
        }

        const params = new URLSearchParams({
          response_type: responseType,
          client_id: clientId,
          redirect_uri: redirectUri,
          'scope': scope,
          code_challenge: code_challenge,
          code_challenge_method: 'S256',
          access_type: "offline",
          prompt: "consent",
        });

        // optional: add scope if you need it
        // params.set('scope', 'openid profile email');

        window.location.href = `${oauthUri}?${params.toString()}`;
      }
      else {
        router.push('/weather');
      }
    };

    initAuth();
  }, []);


  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1>Welcome to OAuth Example</h1>
      </main>
    </div>
  );
}
