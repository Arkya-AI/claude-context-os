// =============================================================================
// RecordDetailPage — View/Create/Edit a single PSTR record
// Collapsible form sections with field-level access control per department.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePstrRecord, useCreatePstr, useUpdatePstr, useDeletePstr } from '../hooks/usePstrRecords';
import { usePatronSearch } from '../hooks/usePatrons';
import { useAuth } from '../hooks/useAuth';
import { SectionTitle } from '../components/common/SectionTitle';
import { RiskBadge, StrActionBadge } from '../components/common/Badge';
import {
  REASON_LABELS,
  LOCATION_LABELS,
  RISK_RATING_LABELS,
  STR_COMMITTEE_ACTION_LABELS,
  DEPARTMENT_ACTION_LABELS,
  DEPARTMENT_FIELD_MAP,
} from '../lib/constants';
import { formatDate } from '../lib/formatters';
import type {
  PstrReason,
  DepartmentAction,
  StrCommitteeAction,
  RiskRating,
  LocationType,
  Patron,
} from '../types/database';

// -----------------------------------------------------------------------------
// Zod Schema
// -----------------------------------------------------------------------------

const pstrFormSchema = z.object({
  patron_id: z.string().min(1, 'Patron is required'),
  transaction_date: z.string().min(1, 'Transaction date is required'),
  nature_of_transaction: z.string().min(1, 'Nature of transaction is required'),
  transaction_amount: z.coerce.number().min(0, 'Amount must be zero or greater'),
  reason: z.enum([
    'NO_UNDERLYING_OBLIGATION',
    'NOT_PROPERLY_IDENTIFIED',
    'NOT_COMMENSURATE',
    'STRUCTURED',
    'UNLAWFUL_ACTIVITY',
    'DEVIATION',
    'OTHERS',
  ] as const, { message: 'Reason is required' }),
  red_flag: z.string().optional().default(''),
  compliance_notes: z.string().optional().default(''),
  casino_marketing_action: z
    .enum(['FOR_DISCUSSION', 'SUBMIT', 'NOTED', 'PENDING'] as const)
    .nullable()
    .optional()
    .default(null),
  casino_marketing_notes: z.string().optional().default(''),
  vip_marketing_action: z
    .enum(['FOR_DISCUSSION', 'SUBMIT', 'NOTED', 'PENDING'] as const)
    .nullable()
    .optional()
    .default(null),
  vip_marketing_notes: z.string().optional().default(''),
  aco_action: z
    .enum(['FOR_DISCUSSION', 'SUBMIT', 'NOTED', 'PENDING'] as const)
    .nullable()
    .optional()
    .default(null),
  aco_notes: z.string().optional().default(''),
  str_committee_action: z
    .enum(['SUBMIT_TO_AMLC', 'FOR_MONITORING', 'ARCHIVE', 'FOR_ADDITIONAL_ACTION'] as const)
    .nullable()
    .optional()
    .default(null),
  pstr_committee_meeting_date: z.string().optional().default(''),
  screening: z.string().optional().default(''),
  risk_rating: z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNRATED'] as const).default('UNRATED'),
  location: z.enum(['SEC', 'SN', 'SOLAIRE_ONLINE', 'MEGAFUNALO', 'GILAS'] as const, {
    message: 'Location is required',
  }),
  year: z.coerce.number().int().min(2018).max(new Date().getFullYear() + 1),
});

type PstrFormData = z.output<typeof pstrFormSchema>;

// -----------------------------------------------------------------------------
// Collapsible Section
// -----------------------------------------------------------------------------

function FormSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="card mb-md">
      <button
        type="button"
        className="card__header w-full"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          fontFamily: 'var(--font-primary)',
          padding: 0,
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span className="card__title">{title}</span>
        <span
          style={{
            fontSize: 'var(--fs-lg)',
            color: 'var(--color-text-muted)',
            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          &#9662;
        </span>
      </button>
      {isOpen && <div className="card__body mt-md">{children}</div>}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Patron Search Combobox
// -----------------------------------------------------------------------------

function PatronSelector({
  value,
  selectedPatron,
  onChange,
  error,
  disabled,
}: {
  value: string;
  selectedPatron: Patron | null;
  onChange: (patronId: string, patron: Patron | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const { data: searchResults } = usePatronSearch(searchTerm);

  const handleSelect = (patron: Patron) => {
    onChange(patron.id, patron);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleClear = () => {
    onChange('', null);
    setSearchTerm('');
  };

  if (value && selectedPatron) {
    return (
      <div className="form-group">
        <label className="form-label form-label--required">Patron</label>
        <div
          className="form-input flex items-center justify-between"
          style={{ backgroundColor: 'var(--color-off-white)' }}
        >
          <div>
            <strong>{selectedPatron.last_name}, {selectedPatron.first_name}</strong>
            <span style={{ marginLeft: 'var(--space-sm)', color: 'var(--color-text-muted)', fontSize: 'var(--fs-xs)' }}>
              {selectedPatron.patron_number}
            </span>
          </div>
          {!disabled && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleClear}
            >
              Change
            </button>
          )}
        </div>
        {error && <span className="form-error">{error}</span>}
      </div>
    );
  }

  return (
    <div className="form-group" style={{ position: 'relative' }}>
      <label className="form-label form-label--required">Patron</label>
      <input
        type="text"
        className={`form-input ${error ? 'form-input--error' : ''}`}
        placeholder="Search by name or patron number..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => {
          // Delay to allow click on dropdown item
          setTimeout(() => setShowDropdown(false), 200);
        }}
        disabled={disabled}
      />
      {error && <span className="form-error">{error}</span>}

      {showDropdown && searchResults && searchResults.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 10,
            backgroundColor: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {searchResults.map((patron) => (
            <button
              key={patron.id}
              type="button"
              style={{
                display: 'block',
                width: '100%',
                padding: 'var(--space-sm) var(--space-md)',
                textAlign: 'left',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-primary)',
                fontSize: 'var(--fs-sm)',
                borderBottom: '1px solid var(--color-border-light)',
              }}
              onClick={() => handleSelect(patron)}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'var(--color-gold-light)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              <strong>{patron.last_name}, {patron.first_name}</strong>
              <span style={{ marginLeft: 'var(--space-sm)', color: 'var(--color-text-muted)' }}>
                {patron.patron_number}
              </span>
            </button>
          ))}
        </div>
      )}

      {showDropdown && searchTerm.length >= 2 && searchResults && searchResults.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 10,
            backgroundColor: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: 'var(--space-md)',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--fs-sm)',
          }}
        >
          No patrons found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// RecordDetailPage
// -----------------------------------------------------------------------------

export function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, canEdit, hasDepartment, profile } = useAuth();

  const isNew = !id;
  const { data: existingRecord, isLoading: isLoadingRecord } = usePstrRecord(id);
  const createMutation = useCreatePstr();
  const updateMutation = useUpdatePstr();
  const deleteMutation = useDeletePstr();

  const [selectedPatron, setSelectedPatron] = useState<Patron | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<PstrFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(pstrFormSchema) as any,
    defaultValues: {
      patron_id: '',
      transaction_date: '',
      nature_of_transaction: '',
      transaction_amount: 0,
      reason: undefined,
      red_flag: '',
      compliance_notes: '',
      casino_marketing_action: null,
      casino_marketing_notes: '',
      vip_marketing_action: null,
      vip_marketing_notes: '',
      aco_action: null,
      aco_notes: '',
      str_committee_action: null,
      pstr_committee_meeting_date: '',
      screening: '',
      risk_rating: 'UNRATED',
      location: undefined,
      year: new Date().getFullYear(),
    },
  });

  // Populate form when existing record loads
  useEffect(() => {
    if (existingRecord) {
      reset({
        patron_id: existingRecord.patron_id,
        transaction_date: existingRecord.transaction_date ?? '',
        nature_of_transaction: existingRecord.nature_of_transaction ?? '',
        transaction_amount: existingRecord.transaction_amount ?? 0,
        reason: existingRecord.reason ?? undefined,
        red_flag: existingRecord.red_flag ?? '',
        compliance_notes: existingRecord.compliance_notes ?? '',
        casino_marketing_action: existingRecord.casino_marketing_action ?? null,
        casino_marketing_notes: existingRecord.casino_marketing_notes ?? '',
        vip_marketing_action: existingRecord.vip_marketing_action ?? null,
        vip_marketing_notes: existingRecord.vip_marketing_notes ?? '',
        aco_action: existingRecord.aco_action ?? null,
        aco_notes: existingRecord.aco_notes ?? '',
        str_committee_action: existingRecord.str_committee_action ?? null,
        pstr_committee_meeting_date: existingRecord.pstr_committee_meeting_date ?? '',
        screening: existingRecord.screening ?? '',
        risk_rating: existingRecord.risk_rating,
        location: existingRecord.location ?? undefined,
        year: existingRecord.year ?? new Date().getFullYear(),
      });

      if (existingRecord.patron) {
        setSelectedPatron(existingRecord.patron);
      }
    }
  }, [existingRecord, reset]);

  // Determine which fields the current user can edit
  const canEditField = useCallback(
    (fieldName: string): boolean => {
      // Admin and compliance officers can edit all fields
      if (isAdmin || hasDepartment('compliance')) return true;

      // Department users can only edit their department's fields
      if (!canEdit || !profile?.department) return false;

      const deptFields = DEPARTMENT_FIELD_MAP[profile.department];
      if (!deptFields) return false;

      return fieldName === deptFields.actionField || fieldName === deptFields.notesField;
    },
    [isAdmin, canEdit, hasDepartment, profile],
  );

  // Can the current user edit the core transaction fields?
  const canEditCore = isAdmin || hasDepartment('compliance');

  const handlePatronChange = (patronId: string, patron: Patron | null) => {
    setValue('patron_id', patronId, { shouldValidate: true, shouldDirty: true });
    setSelectedPatron(patron);
  };

  const onSubmit: SubmitHandler<PstrFormData> = async (data) => {
    setSubmitError(null);
    try {
      // Clean up empty strings to nulls for optional fields
      const payload = {
        ...data,
        red_flag: data.red_flag || null,
        compliance_notes: data.compliance_notes || null,
        casino_marketing_action: data.casino_marketing_action || null,
        casino_marketing_notes: data.casino_marketing_notes || null,
        vip_marketing_action: data.vip_marketing_action || null,
        vip_marketing_notes: data.vip_marketing_notes || null,
        aco_action: data.aco_action || null,
        aco_notes: data.aco_notes || null,
        str_committee_action: data.str_committee_action || null,
        pstr_committee_meeting_date: data.pstr_committee_meeting_date || null,
        screening: data.screening || null,
      };

      if (isNew) {
        await createMutation.mutateAsync(payload);
      } else {
        await updateMutation.mutateAsync({ id: id!, ...payload });
      }

      navigate('/records');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = window.confirm(
      'Are you sure you want to delete this PSTR record? This action cannot be undone.',
    );
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(id);
      navigate('/records');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to delete record.');
    }
  };

  if (!isNew && isLoadingRecord) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" />
        <div className="empty-state__description mt-sm">Loading record...</div>
      </div>
    );
  }

  if (!isNew && !existingRecord && !isLoadingRecord) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Record not found</div>
        <div className="empty-state__description">
          The PSTR record you are looking for does not exist or has been deleted.
        </div>
        <button className="btn btn--secondary" onClick={() => navigate('/records')}>
          Back to Records
        </button>
      </div>
    );
  }

  const watchedRiskRating = watch('risk_rating');
  const watchedStrAction = watch('str_committee_action');

  return (
    <div>
      <SectionTitle
        action={
          <div className="flex items-center gap-sm">
            {!isNew && (
              <>
                <RiskBadge rating={watchedRiskRating} />
                <StrActionBadge action={watchedStrAction ?? null} />
              </>
            )}
          </div>
        }
      >
        {isNew ? 'New PSTR Record' : `PSTR Record #${existingRecord?.sequence_no ?? ''}`}
      </SectionTitle>

      {submitError && (
        <div className="card mb-md" style={{ borderLeft: '4px solid var(--color-deep-red)' }}>
          <div className="form-error" style={{ fontSize: 'var(--fs-sm)', padding: 'var(--space-sm)' }}>
            {submitError}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Section 1: Transaction Info */}
        <FormSection title="Transaction Information">
          <PatronSelector
            value={watch('patron_id')}
            selectedPatron={selectedPatron}
            onChange={handlePatronChange}
            error={errors.patron_id?.message}
            disabled={!canEditCore}
          />

          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label--required" htmlFor="transaction_date">
                Transaction Date
              </label>
              <input
                id="transaction_date"
                type="date"
                className={`form-input ${errors.transaction_date ? 'form-input--error' : ''}`}
                {...register('transaction_date')}
                disabled={!canEditCore}
              />
              {errors.transaction_date && (
                <span className="form-error">{errors.transaction_date.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label form-label--required" htmlFor="transaction_amount">
                Transaction Amount (PHP)
              </label>
              <input
                id="transaction_amount"
                type="number"
                className={`form-input ${errors.transaction_amount ? 'form-input--error' : ''}`}
                {...register('transaction_amount')}
                min={0}
                step="0.01"
                disabled={!canEditCore}
              />
              {errors.transaction_amount && (
                <span className="form-error">{errors.transaction_amount.message}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label form-label--required" htmlFor="nature_of_transaction">
              Nature of Transaction
            </label>
            <textarea
              id="nature_of_transaction"
              className={`form-textarea ${errors.nature_of_transaction ? 'form-textarea--error' : ''}`}
              rows={3}
              {...register('nature_of_transaction')}
              disabled={!canEditCore}
            />
            {errors.nature_of_transaction && (
              <span className="form-error">{errors.nature_of_transaction.message}</span>
            )}
          </div>
        </FormSection>

        {/* Section 2: Classification */}
        <FormSection title="Classification">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label--required" htmlFor="reason">
                Reason
              </label>
              <select
                id="reason"
                className={`form-select ${errors.reason ? 'form-select--error' : ''}`}
                {...register('reason')}
                disabled={!canEditCore}
              >
                <option value="">Select a reason</option>
                {(Object.entries(REASON_LABELS) as [PstrReason, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.reason && <span className="form-error">{errors.reason.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="red_flag">
              Red Flag Indicators
            </label>
            <textarea
              id="red_flag"
              className="form-textarea"
              rows={3}
              placeholder="Describe red flag indicators observed..."
              {...register('red_flag')}
              disabled={!canEditCore}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="compliance_notes">
              Compliance Notes
            </label>
            <textarea
              id="compliance_notes"
              className="form-textarea"
              rows={3}
              placeholder="Additional compliance observations..."
              {...register('compliance_notes')}
              disabled={!canEditCore}
            />
          </div>
        </FormSection>

        {/* Section 3: Casino Marketing */}
        <FormSection title="Casino Marketing" defaultOpen={false}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="casino_marketing_action">
                Action
              </label>
              <select
                id="casino_marketing_action"
                className="form-select"
                {...register('casino_marketing_action')}
                disabled={!canEditField('casino_marketing_action')}
              >
                <option value="">No action</option>
                {(Object.entries(DEPARTMENT_ACTION_LABELS) as [DepartmentAction, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="casino_marketing_notes">
              Notes
            </label>
            <textarea
              id="casino_marketing_notes"
              className="form-textarea"
              rows={3}
              placeholder="Casino marketing observations..."
              {...register('casino_marketing_notes')}
              disabled={!canEditField('casino_marketing_notes')}
            />
          </div>
        </FormSection>

        {/* Section 4: VIP Marketing */}
        <FormSection title="VIP Marketing" defaultOpen={false}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="vip_marketing_action">
                Action
              </label>
              <select
                id="vip_marketing_action"
                className="form-select"
                {...register('vip_marketing_action')}
                disabled={!canEditField('vip_marketing_action')}
              >
                <option value="">No action</option>
                {(Object.entries(DEPARTMENT_ACTION_LABELS) as [DepartmentAction, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="vip_marketing_notes">
              Notes
            </label>
            <textarea
              id="vip_marketing_notes"
              className="form-textarea"
              rows={3}
              placeholder="VIP marketing observations..."
              {...register('vip_marketing_notes')}
              disabled={!canEditField('vip_marketing_notes')}
            />
          </div>
        </FormSection>

        {/* Section 5: ACO */}
        <FormSection title="ACO" defaultOpen={false}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="aco_action">
                Action
              </label>
              <select
                id="aco_action"
                className="form-select"
                {...register('aco_action')}
                disabled={!canEditField('aco_action')}
              >
                <option value="">No action</option>
                {(Object.entries(DEPARTMENT_ACTION_LABELS) as [DepartmentAction, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="aco_notes">
              Notes
            </label>
            <textarea
              id="aco_notes"
              className="form-textarea"
              rows={3}
              placeholder="ACO observations..."
              {...register('aco_notes')}
              disabled={!canEditField('aco_notes')}
            />
          </div>
        </FormSection>

        {/* Section 6: STR Committee */}
        <FormSection title="STR Committee" defaultOpen={false}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="str_committee_action">
                Committee Action
              </label>
              <select
                id="str_committee_action"
                className="form-select"
                {...register('str_committee_action')}
                disabled={!canEditField('str_committee_action')}
              >
                <option value="">No action</option>
                {(Object.entries(STR_COMMITTEE_ACTION_LABELS) as [StrCommitteeAction, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pstr_committee_meeting_date">
                Committee Meeting Date
              </label>
              <input
                id="pstr_committee_meeting_date"
                type="date"
                className="form-input"
                {...register('pstr_committee_meeting_date')}
                disabled={!canEditField('pstr_committee_meeting_date')}
              />
            </div>
          </div>
        </FormSection>

        {/* Section 7: Screening & Risk */}
        <FormSection title="Screening & Risk">
          <div className="form-group">
            <label className="form-label" htmlFor="screening">
              Screening Results
            </label>
            <textarea
              id="screening"
              className="form-textarea"
              rows={3}
              placeholder="Screening and due diligence results..."
              {...register('screening')}
              disabled={!canEditCore}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label form-label--required" htmlFor="risk_rating">
                Risk Rating
              </label>
              <select
                id="risk_rating"
                className={`form-select ${errors.risk_rating ? 'form-select--error' : ''}`}
                {...register('risk_rating')}
                disabled={!canEditCore}
              >
                {(Object.entries(RISK_RATING_LABELS) as [RiskRating, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
              {errors.risk_rating && (
                <span className="form-error">{errors.risk_rating.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label form-label--required" htmlFor="location">
                Location
              </label>
              <select
                id="location"
                className={`form-select ${errors.location ? 'form-select--error' : ''}`}
                {...register('location')}
                disabled={!canEditCore}
              >
                <option value="">Select location</option>
                {(Object.entries(LOCATION_LABELS) as [LocationType, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
              {errors.location && <span className="form-error">{errors.location.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label form-label--required" htmlFor="year">
                Year
              </label>
              <input
                id="year"
                type="number"
                className={`form-input ${errors.year ? 'form-input--error' : ''}`}
                {...register('year')}
                min={2018}
                max={2030}
                disabled={!canEditCore}
              />
              {errors.year && <span className="form-error">{errors.year.message}</span>}
            </div>
          </div>
        </FormSection>

        {/* Metadata (view only, shown for existing records) */}
        {!isNew && existingRecord && (
          <div className="card mb-md card--flat" style={{ backgroundColor: 'var(--color-off-white)' }}>
            <div className="card__header">
              <span className="card__title" style={{ fontSize: 'var(--fs-sm)' }}>Record Metadata</span>
            </div>
            <div className="card__body" style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)' }}>
              <div className="form-row">
                <div>
                  <strong>Created:</strong> {formatDate(existingRecord.created_at)}
                </div>
                <div>
                  <strong>Last Updated:</strong> {formatDate(existingRecord.updated_at)}
                </div>
                <div>
                  <strong>Record ID:</strong> {existingRecord.id}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-lg">
          <div className="flex items-center gap-sm">
            {canEdit && (
              <button
                type="submit"
                className="btn btn--primary"
                disabled={isSubmitting || (!isNew && !isDirty)}
              >
                {isSubmitting ? 'Saving...' : isNew ? 'Create Record' : 'Save Changes'}
              </button>
            )}
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => navigate('/records')}
            >
              Cancel
            </button>
          </div>

          {!isNew && isAdmin && (
            <button
              type="button"
              className="btn btn--danger"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Record'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
