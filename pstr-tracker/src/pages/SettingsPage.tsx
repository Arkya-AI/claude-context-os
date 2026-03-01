import { SectionTitle } from '../components/common/SectionTitle';
import { Badge } from '../components/common/Badge';

export function SettingsPage() {
  return (
    <div>
      <SectionTitle>Settings</SectionTitle>

      {/* App version info */}
      <div className="card mb-lg">
        <div className="card__header">
          <h3 className="card__title">Application Info</h3>
        </div>
        <div className="card__body">
          <div className="form-row">
            <div className="form-group">
              <span className="form-label">Application</span>
              <span style={{ fontSize: '0.875rem', color: '#505046' }}>PSTR Tracker</span>
            </div>
            <div className="form-group">
              <span className="form-label">Version</span>
              <span style={{ fontSize: '0.875rem', color: '#505046' }}>1.0.0-beta</span>
            </div>
            <div className="form-group">
              <span className="form-label">Environment</span>
              <Badge variant="pending">Development</Badge>
            </div>
          </div>
          <div className="form-group">
            <span className="form-label">Description</span>
            <span style={{ fontSize: '0.875rem', color: '#8a8a7e' }}>
              Compliance department tool for tracking Possible Suspicious Transaction Reports
              (PSTRs), patron risk ratings, and AMLC submissions for Solaire Resort &amp; Casino.
            </span>
          </div>
        </div>
      </div>

      {/* Database connection status */}
      <div className="card mb-lg">
        <div className="card__header">
          <h3 className="card__title">Database Connection</h3>
        </div>
        <div className="card__body">
          <div className="form-row">
            <div className="form-group">
              <span className="form-label">Provider</span>
              <span style={{ fontSize: '0.875rem', color: '#505046' }}>Supabase (PostgreSQL)</span>
            </div>
            <div className="form-group">
              <span className="form-label">Status</span>
              <Badge variant="submitted">Connected</Badge>
            </div>
            <div className="form-group">
              <span className="form-label">RLS Policies</span>
              <Badge variant="submitted">Enabled</Badge>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#8a8a7e', marginTop: 8 }}>
            Connection details are managed via environment variables. Contact IT for access changes.
          </p>
        </div>
      </div>

      {/* MFA enrollment */}
      <div className="card mb-lg">
        <div className="card__header">
          <h3 className="card__title">Multi-Factor Authentication</h3>
        </div>
        <div className="card__body">
          <div className="form-group">
            <span className="form-label">MFA Status</span>
            <Badge variant="pending">Not Enrolled</Badge>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#8a8a7e', marginBottom: 16 }}>
            MFA adds an additional layer of security to your account. Once available, you will be
            able to enroll using an authenticator app.
          </p>
          <button className="btn btn--secondary btn--sm" disabled>
            Enroll in MFA (Coming Soon)
          </button>
        </div>
      </div>

      {/* Backup status */}
      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Backup Status</h3>
        </div>
        <div className="card__body">
          <div className="form-row">
            <div className="form-group">
              <span className="form-label">Automatic Backups</span>
              <Badge variant="submitted">Enabled</Badge>
            </div>
            <div className="form-group">
              <span className="form-label">Last Backup</span>
              <span style={{ fontSize: '0.875rem', color: '#8a8a7e' }}>
                Managed by Supabase
              </span>
            </div>
            <div className="form-group">
              <span className="form-label">Retention</span>
              <span style={{ fontSize: '0.875rem', color: '#505046' }}>7 days</span>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#8a8a7e', marginTop: 8 }}>
            Database backups are handled by the Supabase platform. Point-in-time recovery is
            available on the Pro plan. Contact IT for manual backup requests.
          </p>
        </div>
      </div>
    </div>
  );
}
