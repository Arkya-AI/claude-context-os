import { SectionTitle } from '../components/common/SectionTitle';

export function AmlcRequestsPage() {
  return (
    <div>
      <SectionTitle>AMLC Requests</SectionTitle>

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">AMLC Requests Management</h3>
        </div>
        <div className="card__body">
          <div className="empty-state">
            <div className="empty-state__title">
              AMLC Requests management
            </div>
            <p className="empty-state__description">
              21 records from imported data. This section will be fully populated after
              data migration is complete.
            </p>
          </div>

          {/* Placeholder table structure */}
          <div className="data-table-wrapper mt-lg">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference Number</th>
                  <th>Request Type</th>
                  <th>Patron</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#8a8a7e', padding: '2rem' }}>
                    Data pending migration. Table will be populated once import is finalized.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
