import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { adminHeaders, clearAdminToken, getAdminToken, setAdminToken } from './adminSession';

const apiBase = import.meta.env.PROD
  ? window.location.origin
  : (import.meta.env.VITE_API_URL ?? 'http://localhost:5100');
type User = { username: string };
type LoginResponse = User & { token: string };

export default function AdminGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!getAdminToken()) {
      setChecking(false);
      return () => { active = false; };
    }
    fetch(`${apiBase}/api/admin/me`, { headers: adminHeaders() })
      .then(async (response) => response.ok ? (await response.json()) as User : null)
      .then((current) => {
        if (!active) return;
        if (!current) clearAdminToken();
        setUser(current);
      })
      .catch(() => { if (active) setError('Cannot reach the GemFlow API.'); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/api/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (response.status === 429) throw new Error('Too many attempts. Try again in a few minutes.');
      if (response.status === 401) throw new Error('Incorrect username or password.');
      if (!response.ok) throw new Error(`Login failed (HTTP ${response.status}).`);
      const signedIn = (await response.json()) as LoginResponse;
      if (!signedIn.token) throw new Error('The API did not return an admin session token. Deploy the backend update first.');
      setAdminToken(signedIn.token);
      // Only display "Signed in" after the API verifies the new session.
      const check = await fetch(`${apiBase}/api/admin/me`, { headers: adminHeaders() });
      if (!check.ok) { clearAdminToken(); throw new Error('Admin login could not be verified.'); }
      const verified = await check.json() as User;
      setUser(verified);
      setPassword('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign in.');
    } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try {
      // Best effort; token also expires server-side after 8 hours.
      await fetch(`${apiBase}/api/admin/logout`, { method: 'POST', headers: adminHeaders(true) });
    } catch { /* sign-out still clears this browser session */ }
    clearAdminToken();
    setUser(null);
    setError('');
    setBusy(false);
  }

  if (checking) return <main className="gf-auth-wrap"><div className="gf-auth-panel" role="status">Checking administrator session…</div></main>;
  if (!user) return (
    <main className="gf-auth-wrap">
      <section className="gf-auth-panel" aria-labelledby="gf-login-title">
        <a href="/" className="gf-auth-brand">◇ GEMFLOW <span>ADMIN</span></a>
        <p className="gf-auth-kicker">STAFF ACCESS</p>
        <h1 id="gf-login-title">Sign in to GemFlow</h1>
        <p className="text-secondary">Manage catalog, inventory, and orders from one workspace.</p>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <form onSubmit={(event) => { void signIn(event); }}>
          <label className="form-label" htmlFor="gf-admin-username">Username</label>
          <input id="gf-admin-username" className="form-control mb-3" autoComplete="username" required
            value={username} onChange={(event) => setUsername(event.target.value)} />
          <label className="form-label" htmlFor="gf-admin-password">Password</label>
          <input id="gf-admin-password" className="form-control mb-4" type="password" required
            autoComplete="current-password" value={password}
            onChange={(event) => setPassword(event.target.value)} />
          <button className="btn btn-dark w-100" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <a href="/" className="d-inline-block mt-4">← Return to storefront</a>
      </section>
    </main>
  );

  return (
    <>
      <div className="gf-auth-session">
        <span>Signed in as <strong>{user.username}</strong></span>
        <button className="btn btn-sm btn-outline-secondary" type="button" disabled={busy} onClick={() => { void signOut(); }}>
          Sign out
        </button>
      </div>
      {error && <div className="alert alert-warning m-3" role="alert">{error}</div>}
      {children}
    </>
  );
}
