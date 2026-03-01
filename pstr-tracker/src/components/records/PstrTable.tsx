// =============================================================================
// PstrTable — TanStack Table for PSTR records listing
// Displays paginated, sortable PSTR records with navigation to detail view.
// =============================================================================

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import type { PstrRecord } from '../../types/database';
import { StrActionBadge, RiskBadge } from '../common/Badge';
import { formatCurrency, formatDate, truncateText } from '../../lib/formatters';
import { REASON_LABELS, LOCATION_LABELS, PAGE_SIZE_OPTIONS } from '../../lib/constants';

interface PstrTableProps {
  data: PstrRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading: boolean;
}

const columnHelper = createColumnHelper<PstrRecord>();

const columns = [
  columnHelper.accessor('sequence_no', {
    header: 'No.',
    cell: (info) => info.getValue(),
    size: 70,
  }),
  columnHelper.display({
    id: 'patron',
    header: 'Patron',
    cell: ({ row }) => {
      const patron = row.original.patron;
      if (!patron) return <span className="text-muted">--</span>;
      return (
        <div>
          <div style={{ fontWeight: 'var(--fw-semibold)' }}>
            {patron.last_name}, {patron.first_name}
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)' }}>
            {patron.patron_number}
          </div>
        </div>
      );
    },
    size: 180,
  }),
  columnHelper.accessor('transaction_date', {
    header: 'Date',
    cell: (info) => {
      const val = info.getValue();
      return val ? formatDate(val) : '--';
    },
    size: 110,
  }),
  columnHelper.accessor('nature_of_transaction', {
    header: 'Transaction',
    cell: (info) => {
      const val = info.getValue();
      return val ? truncateText(val, 40) : '--';
    },
    size: 200,
  }),
  columnHelper.accessor('transaction_amount', {
    header: 'Amount',
    cell: (info) => {
      const val = info.getValue();
      return val != null ? formatCurrency(val) : '--';
    },
    size: 140,
  }),
  columnHelper.accessor('reason', {
    header: 'Reason',
    cell: (info) => {
      const val = info.getValue();
      if (!val) return '--';
      return (
        <span className="badge badge--draft" title={REASON_LABELS[val]}>
          {truncateText(REASON_LABELS[val], 24)}
        </span>
      );
    },
    size: 180,
  }),
  columnHelper.accessor('location', {
    header: 'Location',
    cell: (info) => {
      const val = info.getValue();
      if (!val) return '--';
      return (
        <span className="badge badge--default">
          {LOCATION_LABELS[val]}
        </span>
      );
    },
    size: 150,
  }),
  columnHelper.accessor('str_committee_action', {
    header: 'STR Action',
    cell: (info) => <StrActionBadge action={info.getValue()} />,
    size: 150,
  }),
  columnHelper.accessor('risk_rating', {
    header: 'Risk',
    cell: (info) => <RiskBadge rating={info.getValue()} />,
    size: 100,
  }),
];

export function PstrTable({
  data,
  totalCount,
  page,
  pageSize,
  totalPages,
  sorting,
  onSortingChange,
  onPageChange,
  onPageSizeChange,
  isLoading,
}: PstrTableProps) {
  const navigate = useNavigate();

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortingChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
  });

  const handleRowClick = (id: string) => {
    navigate(`/records/${id}`);
  };

  // Generate page numbers for pagination with ellipsis logic
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (page > 3) {
        pages.push('ellipsis');
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push('ellipsis');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const fromRecord = (page - 1) * pageSize + 1;
  const toRecord = Math.min(page * pageSize, totalCount);

  return (
    <div>
      {/* Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      data-sortable={canSort || undefined}
                      data-sort={sortDir || undefined}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="text-center" style={{ padding: 'var(--space-2xl)' }}>
                  <div className="loading-spinner" style={{ margin: '0 auto' }} />
                  <div style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-muted)' }}>
                    Loading records...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty-state">
                    <div className="empty-state__title">No records found</div>
                    <div className="empty-state__description">
                      Try adjusting your filters or search criteria.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => handleRowClick(row.original.id)}
                  style={{ cursor: 'pointer' }}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(row.original.id);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between mt-md" style={{ flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div className="pagination__info">
            Showing {fromRecord}&#8211;{toRecord} of {totalCount.toLocaleString()} records
          </div>

          <div className="pagination">
            {/* Previous */}
            <button
              className="pagination__btn"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              &laquo; Previous
            </button>

            {/* Page Numbers */}
            {getPageNumbers().map((p, idx) =>
              p === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="pagination__ellipsis">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  className={`pagination__btn ${p === page ? 'pagination__btn--active' : ''}`}
                  onClick={() => onPageChange(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              ),
            )}

            {/* Next */}
            <button
              className="pagination__btn"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              Next &raquo;
            </button>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-xs">
            <label
              htmlFor="page-size-select"
              style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)' }}
            >
              Rows per page:
            </label>
            <select
              id="page-size-select"
              className="form-select"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(parseInt(e.target.value, 10));
                onPageChange(1);
              }}
              style={{ width: 'auto', minWidth: 70 }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
