import { useState, useEffect } from 'react';
import { usePatrons } from '../hooks/usePatrons';
import { SectionTitle } from '../components/common/SectionTitle';
import { RiskBadge } from '../components/common/Badge';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../lib/constants';

export function PatronsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const { data, isLoading, isError } = usePatrons(
    debouncedSearch || undefined,
    page,
    pageSize
  );

  const totalPages = data?.totalPages ?? 0;
  const totalCount = data?.count ?? 0;

  return (
    <div>
      <SectionTitle>Patrons</SectionTitle>

      {/* Search and controls */}
      <div className="filter-bar mb-lg">
        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 280 }}>
          <input
            className="form-input"
            type="text"
            placeholder="Search by patron name or number..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-sm">
          <label className="filter-bar__label" htmlFor="page-size">Rows</label>
          <select
            id="page-size"
            className="form-select"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            style={{ width: 80 }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#B22600', fontWeight: 600, marginBottom: 8 }}>
            Failed to load patron data.
          </p>
          <p style={{ color: '#8a8a7e', fontSize: '0.875rem' }}>
            Please check your connection and try again.
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="loading-spinner" />
          <p style={{ color: '#8a8a7e', fontSize: '0.875rem', marginTop: 12 }}>
            Loading patrons...
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data && data.data.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__title">No patrons found</div>
          <p className="empty-state__description">
            {debouncedSearch
              ? `No patrons match "${debouncedSearch}". Try a different search term.`
              : 'No patron records have been imported yet.'}
          </p>
        </div>
      )}

      {/* Patron table */}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patron Number</th>
                  <th>Last Name</th>
                  <th>First Name</th>
                  <th>Risk Rating</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((patron) => (
                  <tr key={patron.id}>
                    <td style={{ fontWeight: 600 }}>{patron.patron_number}</td>
                    <td>{patron.last_name}</td>
                    <td>{patron.first_name}</td>
                    <td>
                      <RiskBadge rating={patron.risk_rating} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination mt-md">
            <button
              className="pagination__btn"
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >
              First
            </button>
            <button
              className="pagination__btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show pages around current page
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`pagination__btn ${pageNum === page ? 'pagination__btn--active' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              className="pagination__btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
            <button
              className="pagination__btn"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              Last
            </button>

            <span className="pagination__info">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
