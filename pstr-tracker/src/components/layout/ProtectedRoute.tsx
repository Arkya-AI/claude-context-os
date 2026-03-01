import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedRoute() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Block users without a profile or deactivated users
  if (!profile || !profile.is_active) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">Access Denied</h1>
          <p style={{ textAlign: 'center', color: 'var(--color-charcoal)', marginBottom: 'var(--space-md)' }}>
            Your account has not been provisioned or has been deactivated.
            Contact the Compliance Department administrator.
          </p>
          <button
            className="btn btn--secondary btn--full"
            onClick={() => {
              window.location.href = '/login';
            }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
