// =============================================================================
// RecordsPage — Main PSTR records listing
// Displays filterable, sortable, paginated table of all PSTR records.
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionTitle } from '../components/common/SectionTitle';
import { FilterBar } from '../components/records/FilterBar';
import { PstrTable } from '../components/records/PstrTable';
import { ExportButton } from '../components/common/ExportButton';
import { usePstrRecords } from '../hooks/usePstrRecords';
import { useAuth } from '../hooks/useAuth';
import type { PstrFilters } from '../types/database';
import type { SortingState } from '@tanstack/react-table';
import { DEFAULT_PAGE_SIZE } from '../lib/constants';

export function RecordsPage() {
  const navigate = useNavigate();
  const { canEdit } = useAuth();

  // Filter state
  const [filters, setFilters] = useState<PstrFilters>({});

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'sequence_no', desc: true },
  ]);

  // Derive sort params from TanStack sorting state
  const sortBy = sorting.length > 0 ? sorting[0].id : 'sequence_no';
  const sortOrder = sorting.length > 0 && sorting[0].desc ? 'desc' : 'asc';

  // Fetch data
  const { data, isLoading } = usePstrRecords(filters, {
    page,
    pageSize,
    sortBy,
    sortOrder,
  });

  // Reset to page 1 when filters change
  const handleFiltersChange = (newFilters: PstrFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export triggered with current filters:', filters);
  };

  return (
    <div>
      <SectionTitle
        action={
          <div className="flex items-center gap-sm">
            {canEdit && (
              <button
                className="btn btn--primary"
                onClick={() => navigate('/records/new')}
              >
                + Add New
              </button>
            )}
            <ExportButton onClick={handleExport} label="Export" />
          </div>
        }
      >
        PSTR Records
      </SectionTitle>

      <FilterBar filters={filters} onChange={handleFiltersChange} />

      <PstrTable
        data={data?.data ?? []}
        totalCount={data?.count ?? 0}
        page={page}
        pageSize={pageSize}
        totalPages={data?.totalPages ?? 0}
        sorting={sorting}
        onSortingChange={setSorting}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
      />
    </div>
  );
}
