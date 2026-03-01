// =============================================================================
// FilterBar — PSTR Records filter controls
// Provides search, dropdown filters, date range, and amount range inputs.
// =============================================================================

import type { PstrFilters } from '../../types/database';
import type { PstrReason, LocationType, RiskRating, StrCommitteeAction } from '../../types/database';
import {
  REASON_LABELS,
  LOCATION_LABELS,
  RISK_RATING_LABELS,
  STR_COMMITTEE_ACTION_LABELS,
} from '../../lib/constants';

interface FilterBarProps {
  filters: PstrFilters;
  onChange: (filters: PstrFilters) => void;
}

// Year options: 2018 through current year
const YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 2018 + 1 },
  (_, i) => 2018 + i,
);

const REASON_OPTIONS = Object.entries(REASON_LABELS) as [PstrReason, string][];
const LOCATION_OPTIONS = Object.entries(LOCATION_LABELS) as [LocationType, string][];
const RISK_RATING_OPTIONS = Object.entries(RISK_RATING_LABELS) as [RiskRating, string][];
const STR_ACTION_OPTIONS = Object.entries(STR_COMMITTEE_ACTION_LABELS) as [StrCommitteeAction, string][];

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const updateFilter = <K extends keyof PstrFilters>(key: K, value: PstrFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const handleMultiSelect = <T extends string>(
    key: keyof PstrFilters,
    currentValues: T[] | undefined,
    value: T,
  ) => {
    const current = currentValues ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateFilter(key, next.length > 0 ? next as PstrFilters[typeof key] : undefined);
  };

  const clearAllFilters = () => {
    onChange({});
  };

  const hasActiveFilters =
    !!filters.search ||
    (filters.reason?.length ?? 0) > 0 ||
    (filters.location?.length ?? 0) > 0 ||
    (filters.year?.length ?? 0) > 0 ||
    (filters.risk_rating?.length ?? 0) > 0 ||
    (filters.str_committee_action?.length ?? 0) > 0 ||
    !!filters.date_from ||
    !!filters.date_to ||
    filters.amount_min !== undefined ||
    filters.amount_max !== undefined;

  return (
    <div className="card mb-lg">
      {/* Row 1: Search and dropdowns */}
      <div className="filter-bar">
        <span className="filter-bar__label">Filters</span>

        {/* Text Search */}
        <input
          type="text"
          className="form-input"
          placeholder="Search patron name, notes..."
          value={filters.search ?? ''}
          onChange={(e) =>
            updateFilter('search', e.target.value || undefined)
          }
          style={{ maxWidth: 240 }}
        />

        {/* Reason */}
        <select
          className="form-select"
          value=""
          onChange={(e) => {
            if (e.target.value) {
              handleMultiSelect('reason', filters.reason, e.target.value as PstrReason);
            }
          }}
          style={{ maxWidth: 200 }}
          aria-label="Filter by reason"
        >
          <option value="">Reason</option>
          {REASON_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {filters.reason?.includes(value) ? '\u2713 ' : ''}{label}
            </option>
          ))}
        </select>

        {/* Location */}
        <select
          className="form-select"
          value=""
          onChange={(e) => {
            if (e.target.value) {
              handleMultiSelect('location', filters.location, e.target.value as LocationType);
            }
          }}
          style={{ maxWidth: 180 }}
          aria-label="Filter by location"
        >
          <option value="">Location</option>
          {LOCATION_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {filters.location?.includes(value) ? '\u2713 ' : ''}{label}
            </option>
          ))}
        </select>

        {/* Year */}
        <select
          className="form-select"
          value=""
          onChange={(e) => {
            if (e.target.value) {
              const year = parseInt(e.target.value, 10);
              const current = filters.year ?? [];
              const next = current.includes(year)
                ? current.filter((y) => y !== year)
                : [...current, year];
              updateFilter('year', next.length > 0 ? next : undefined);
            }
          }}
          style={{ maxWidth: 120 }}
          aria-label="Filter by year"
        >
          <option value="">Year</option>
          {YEAR_OPTIONS.map((year) => (
            <option key={year} value={year}>
              {filters.year?.includes(year) ? '\u2713 ' : ''}{year}
            </option>
          ))}
        </select>

        {/* Risk Rating */}
        <select
          className="form-select"
          value=""
          onChange={(e) => {
            if (e.target.value) {
              handleMultiSelect('risk_rating', filters.risk_rating, e.target.value as RiskRating);
            }
          }}
          style={{ maxWidth: 150 }}
          aria-label="Filter by risk rating"
        >
          <option value="">Risk Rating</option>
          {RISK_RATING_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {filters.risk_rating?.includes(value) ? '\u2713 ' : ''}{label}
            </option>
          ))}
        </select>

        {/* STR Committee Action */}
        <select
          className="form-select"
          value=""
          onChange={(e) => {
            if (e.target.value) {
              handleMultiSelect(
                'str_committee_action',
                filters.str_committee_action,
                e.target.value as StrCommitteeAction,
              );
            }
          }}
          style={{ maxWidth: 200 }}
          aria-label="Filter by STR committee action"
        >
          <option value="">STR Action</option>
          {STR_ACTION_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {filters.str_committee_action?.includes(value) ? '\u2713 ' : ''}{label}
            </option>
          ))}
        </select>
      </div>

      {/* Row 2: Date range, Amount range, Clear */}
      <div className="filter-bar mt-sm">
        {/* Date Range */}
        <span className="filter-bar__label">Date</span>
        <input
          type="date"
          className="form-input"
          value={filters.date_from ?? ''}
          onChange={(e) =>
            updateFilter('date_from', e.target.value || undefined)
          }
          style={{ maxWidth: 160 }}
          aria-label="Date from"
        />
        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)' }}>to</span>
        <input
          type="date"
          className="form-input"
          value={filters.date_to ?? ''}
          onChange={(e) =>
            updateFilter('date_to', e.target.value || undefined)
          }
          style={{ maxWidth: 160 }}
          aria-label="Date to"
        />

        {/* Amount Range */}
        <span className="filter-bar__label" style={{ marginLeft: 'var(--space-sm)' }}>Amount</span>
        <input
          type="number"
          className="form-input"
          placeholder="Min"
          value={filters.amount_min ?? ''}
          onChange={(e) =>
            updateFilter(
              'amount_min',
              e.target.value ? parseFloat(e.target.value) : undefined,
            )
          }
          style={{ maxWidth: 130 }}
          min={0}
          aria-label="Minimum amount"
        />
        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)' }}>to</span>
        <input
          type="number"
          className="form-input"
          placeholder="Max"
          value={filters.amount_max ?? ''}
          onChange={(e) =>
            updateFilter(
              'amount_max',
              e.target.value ? parseFloat(e.target.value) : undefined,
            )
          }
          style={{ maxWidth: 130 }}
          min={0}
          aria-label="Maximum amount"
        />

        {/* Active filter chips */}
        <div style={{ flex: 1 }} />

        {hasActiveFilters && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={clearAllFilters}
            type="button"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Active filter summary chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-xs mt-sm" style={{ paddingLeft: 'var(--space-md)' }}>
          {filters.reason?.map((r) => (
            <span
              key={r}
              className="filter-chip filter-chip--active"
              onClick={() => handleMultiSelect('reason', filters.reason, r)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleMultiSelect('reason', filters.reason, r);
                }
              }}
            >
              {REASON_LABELS[r]} &times;
            </span>
          ))}
          {filters.location?.map((l) => (
            <span
              key={l}
              className="filter-chip filter-chip--active"
              onClick={() => handleMultiSelect('location', filters.location, l)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleMultiSelect('location', filters.location, l);
                }
              }}
            >
              {LOCATION_LABELS[l]} &times;
            </span>
          ))}
          {filters.year?.map((y) => (
            <span
              key={y}
              className="filter-chip filter-chip--active"
              onClick={() => {
                const next = (filters.year ?? []).filter((v) => v !== y);
                updateFilter('year', next.length > 0 ? next : undefined);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  const next = (filters.year ?? []).filter((v) => v !== y);
                  updateFilter('year', next.length > 0 ? next : undefined);
                }
              }}
            >
              {y} &times;
            </span>
          ))}
          {filters.risk_rating?.map((r) => (
            <span
              key={r}
              className="filter-chip filter-chip--active"
              onClick={() => handleMultiSelect('risk_rating', filters.risk_rating, r)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleMultiSelect('risk_rating', filters.risk_rating, r);
                }
              }}
            >
              {RISK_RATING_LABELS[r]} &times;
            </span>
          ))}
          {filters.str_committee_action?.map((a) => (
            <span
              key={a}
              className="filter-chip filter-chip--active"
              onClick={() =>
                handleMultiSelect('str_committee_action', filters.str_committee_action, a)
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleMultiSelect('str_committee_action', filters.str_committee_action, a);
                }
              }}
            >
              {STR_COMMITTEE_ACTION_LABELS[a]} &times;
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
