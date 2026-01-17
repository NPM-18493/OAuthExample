export default function AboutPage() {
    return (
        <main style={{ padding: 24 }}>
            <h1>About This App</h1>
            <p>
                This is a sample Next.js application demonstrating OAuth 2.0 authentication with PKCE using Google as the identity provider. It showcases secure token handling, protected API access, and modern React features.
            </p>
            <h2>Features</h2>
            <ul>
                <li>OAuth 2.0 Authorization Code Flow with PKCE</li>
                <li>Secure storage of tokens in sessionStorage</li>
                <li>Protected API calls with automatic token refresh</li>
                <li>Next.js 13 with App Router and React Server Components</li>
            </ul>
            <h2>Technologies Used</h2>
            <ul>
                <li>Next.js 13</li>
                <li>React 18</li>
                <li>TypeScript</li>
                <li>Axios for API requests</li>
                <li>Google Identity Platform</li>
            </ul>
            <h2>Setup Instructions</h2>
            <ol>
                <li>Clone the repository from GitHub.</li>
                <li>Install dependencies using <code>npm install</code> or <code>yarn install</code>.</li>
                <li>Set up a Google OAuth 2.0 Client ID and configure the redirect URIs.</li>
                <li>Create a <code>.env.local</code> file with the necessary environment variables.</li>
                <li>Run the development server using <code>npm run dev</code> or <code>yarn dev</code>.</li>
            </ol>
            <h2>Disclaimer</h2>
            <p>
                This application is for educational purposes only. Ensure you follow best security practices when handling authentication and tokens in production applications.
            </p>
        </main>
    );
}