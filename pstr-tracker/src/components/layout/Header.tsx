import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS, DEPARTMENT_LABELS } from '../../lib/constants';

export function Header() {
  const { user, profile, signOut } = useAuth();

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">PSTR Tracker</h1>
      </div>
      <div className="header-right">
        {profile && (
          <div className="header-user-info">
            <span className="header-user-name">{profile.full_name || user?.email}</span>
            <span className="header-user-role">
              {ROLE_LABELS[profile.role]} — {DEPARTMENT_LABELS[profile.department]}
            </span>
          </div>
        )}
        <button className="btn btn--ghost" onClick={signOut}>
          Sign Out
        </button>
      </div>
    </header>
  );
}
