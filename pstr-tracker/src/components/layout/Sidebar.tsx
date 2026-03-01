import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/records', label: 'PSTR Records', icon: '📋' },
  { to: '/patrons', label: 'Patrons', icon: '👤' },
  { to: '/import', label: 'Import / Export', icon: '📥' },
  { to: '/amlc-requests', label: 'AMLC Requests', icon: '📨' },
];

const ADMIN_ITEMS = [
  { to: '/audit-log', label: 'Audit Log', icon: '🔍' },
  { to: '/users', label: 'User Management', icon: '⚙️' },
  { to: '/settings', label: 'Settings', icon: '🔧' },
];

export function Sidebar() {
  const { isAdmin } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img
          src="/solaire-logo.svg"
          alt="Solaire Resort & Casino"
          height={44}
        />
      </div>
      <div className="sidebar-title">PSTR Tracker</div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`
            }
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-label">{item.label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-section-label">Administration</div>
            {ADMIN_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`
                }
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span className="sidebar-nav-label">{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="confidential-badge">CONFIDENTIAL</div>
      </div>
    </aside>
  );
}
