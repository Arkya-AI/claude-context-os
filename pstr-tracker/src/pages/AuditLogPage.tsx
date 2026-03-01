import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { SectionTitle } from '../components/common/SectionTitle';
import { Badge } from '../components/common/Badge';
import { formatDateTime, sanitizeSearchInput } from '../lib/formatters';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../lib/constants';
import type { AuditLogEntry } from '../types/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TABLE_OPTIONS = [
  'pstr_records',
  'patrons',
  'amlc_requests',
  'user_profiles',
] as const;

const ACTION_OPTIONS = ['INSERT', 'UPDATE', 'DELETE'] as const;

type ActionType = (typeof ACTION_OPTIONS)[number];

// ---------------------------------------------------------------------------
// Hook: useAuditLog
// ---------------------------------------------------------------------------
function useAuditLog(filters: {
  dateFrom?: string;
  dateTo?: string;
  tableName?: string;
  action?: ActionType;
  userEmail?: string;
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: ['audit-log', filters],
    queryFn: async () => {
      const from = (filters.page - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;

      let query = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
      }
      if (filters.tableName) {
        query = query.eq('table_name', filters.tableName);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.userEmail) {
        const safe = sanitizeSearchInput(filters.userEmail);
        if (safe.length > 0) {
          query = query.ilike('user_email', `%${safe}%`);
        }
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data as AuditLogEntry[],
        count: count ?? 0,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages: Math.ceil((count ?? 0) / filters.pageSize),
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Diff viewer for expanded rows
// ---------------------------------------------------------------------------
function DiffView({ entry }: { entry: AuditLogEntry }) {
  const changedFields = entry.changed_fields ?? [];
  const oldValues = entry.old_values ?? {};
  const newValues = entry.new_values ?? {};

  if (entry.action === 'INSERT') {
    return (
      <div style={{ padding: '12px 16px', backgroundColor: '#f9f8f6' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#505046', marginBottom: 8 }}>
          New Record Values
        </p>
        <table className="data-table data-table--compact" style={{ fontSize: '0.75rem' }}>
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(newValues).map(([key, val]) => (
              <tr key={key}>
                <td style={{ fontWeight: 600 }}>{key}</td>
                <td>{val !== null && val !== undefined ? String(val) : '(null)'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (entry.action === 'DELETE') {
    return (
      <div style={{ padding: '12px 16px', backgroundColor: '#f9f8f6' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B22600', marginBottom: 8 }}>
          Deleted Record Values
        </p>
        <table className="data-table data-table--compact" style={{ fontSize: '0.75rem' }}>
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(oldValues).map(([key, val]) => (
              <tr key={key}>
                <td style={{ fontWeight: 600 }}>{key}</td>
                <td>{val !== null && val !== undefined ? String(val) : '(null)'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // UPDATE — show field-level diff
  return (
    <div style={{ padding: '12px 16px', backgroundColor: '#f9f8f6' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#505046', marginBottom: 8 }}>
        Changed Fields
      </p>
      {changedFields.length === 0 ? (
        <p style={{ fontSize: '0.75rem', color: '#8a8a7e' }}>No field-level changes recorded.</p>
      ) : (
        <table className="data-table data-table--compact" style={{ fontSize: '0.75rem' }}>
          <thead>
            <tr>
              <th>Field</th>
              <th>Old Value</th>
              <th>New Value</th>
            </tr>
          </thead>
          <tbody>
            {changedFields.map((field) => (
              <tr key={field}>
                <td style={{ fontWeight: 600 }}>{field}</td>
                <td style={{ color: '#B22600' }}>
                  {oldValues[field] !== null && oldValues[field] !== undefined
                    ? String(oldValues[field])
                    : '(null)'}
                </td>
                <td style={{ color: '#008000' }}>
                  {newValues[field] !== null && newValues[field] !== undefined
                    ? String(newValues[field])
                    : '(null)'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action badge
// ---------------------------------------------------------------------------
function ActionTypeBadge({ action }: { action: ActionType }) {
  const variantMap: Record<ActionType, 'submitted' | 'warning' | 'high-risk'> = {
    INSERT: 'submitted',
    UPDATE: 'warning',
    DELETE: 'high-risk',
  };
  return <Badge variant={variantMap[action]}>{action}</Badge>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AuditLogPage() {
  const { isAdmin } = useAuth();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tableName, setTableName] = useState('');
  const [action, setAction] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Access control
  if (!isAdmin) {
    return (
      <div>
        <SectionTitle>Audit Log</SectionTitle>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#B22600', fontWeight: 600, fontSize: '1.125rem', marginBottom: 8 }}>
            Access Denied
          </p>
          <p style={{ color: '#8a8a7e', fontSize: '0.875rem' }}>
            You do not have permission to view the audit log. Admin access is required.
          </p>
        </div>
      </div>
    );
  }

  const { data, isLoading, isError } = useAuditLog({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    tableName: tableName || undefined,
    action: (action as ActionType) || undefined,
    userEmail: userEmail || undefined,
    page,
    pageSize,
  });

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalPages = data?.totalPages ?? 0;
  const totalCount = data?.count ?? 0;

  return (
    <div>
      <SectionTitle>Audit Log</SectionTitle>

      {/* Filters */}
      <div className="filter-bar mb-lg">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="filter-date-from">From</label>
          <input
            id="filter-date-from"
            className="form-input"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            style={{ width: 160 }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="filter-date-to">To</label>
          <input
            id="filter-date-to"
            className="form-input"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            style={{ width: 160 }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="filter-table">Table</label>
          <select
            id="filter-table"
            className="form-select"
            value={tableName}
            onChange={(e) => { setTableName(e.target.value); setPage(1); }}
            style={{ width: 160 }}
          >
            <option value="">All Tables</option>
            {TABLE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="filter-action">Action</label>
          <select
            id="filter-action"
            className="form-select"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            style={{ width: 130 }}
          >
            <option value="">All</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="filter-user">User</label>
          <input
            id="filter-user"
            className="form-input"
            type="text"
            placeholder="Search by email..."
            value={userEmail}
            onChange={(e) => { setUserEmail(e.target.value); setPage(1); }}
            style={{ width: 200 }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="filter-pagesize">Rows</label>
          <select
            id="filter-pagesize"
            className="form-select"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
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
          <p style={{ color: '#B22600', fontWeight: 600 }}>Failed to load audit log.</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#8a8a7e', fontSize: '0.875rem' }}>Loading audit log...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data && data.data.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__title">No audit log entries found</div>
          <p className="empty-state__description">
            Adjust your filters or check back later.
          </p>
        </div>
      )}

      {/* Audit log table */}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Table</th>
                  <th>Record ID</th>
                  <th>Action</th>
                  <th>Changed Fields</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((entry) => (
                  <Fragment key={entry.id}>
                    <tr
                      onClick={() => toggleRow(entry.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ textAlign: 'center', fontSize: '0.75rem', color: '#8a8a7e' }}>
                        {expandedRows.has(entry.id) ? '\u25BC' : '\u25B6'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td>{entry.user_email ?? '(system)'}</td>
                      <td>
                        <code style={{ fontSize: '0.75rem', background: '#f9f8f6', padding: '2px 6px', borderRadius: 4 }}>
                          {entry.table_name}
                        </code>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {entry.record_id.substring(0, 8)}...
                      </td>
                      <td>
                        <ActionTypeBadge action={entry.action} />
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#8a8a7e' }}>
                        {entry.changed_fields
                          ? entry.changed_fields.join(', ')
                          : '\u2014'}
                      </td>
                    </tr>
                    {expandedRows.has(entry.id) && (
                      <tr key={`${entry.id}-diff`}>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <DiffView entry={entry} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
