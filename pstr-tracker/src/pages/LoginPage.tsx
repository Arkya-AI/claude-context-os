import { useState, useRef, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;

export function LoginPage() {
  const { session, signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const failedAttempts = useRef(0);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;
  const lockoutSeconds = isLockedOut
    ? Math.ceil((lockoutUntil! - Date.now()) / 1000)
    : 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);

    if (signInError) {
      failedAttempts.current += 1;
      if (failedAttempts.current >= MAX_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS);
        failedAttempts.current = 0;
        // Auto-clear lockout after duration
        setTimeout(() => setLockoutUntil(null), LOCKOUT_DURATION_MS);
      }
    } else {
      failedAttempts.current = 0;
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <img src="/solaire-logo.svg" alt="Solaire" height={48} />
        </div>
        <h1 className="login-title">PSTR Tracker</h1>
        <p className="login-subtitle">Compliance Department — Solaire Resort & Casino</p>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && !isLockedOut && <div className="form-error">{error}</div>}
          {isLockedOut && (
            <div className="form-error">
              Too many failed attempts. Try again in {lockoutSeconds} seconds.
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              disabled={isLockedOut}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isLockedOut}
            />
          </div>

          <button
            className="btn btn--primary btn--full"
            type="submit"
            disabled={submitting || isLockedOut}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <div className="confidential-badge confidential-badge--inline">
            CONFIDENTIAL — INTERNAL USE ONLY
          </div>
        </div>
      </div>
    </div>
  );
}
