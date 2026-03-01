// =============================================================================
// PSTR Tracker — Constants & Display Labels
// Human-readable labels for database enum values and application constants.
// =============================================================================

import type {
  PstrReason,
  DepartmentAction,
  StrCommitteeAction,
  RiskRating,
  LocationType,
  UserRole,
  DepartmentType,
} from '../types/database';

// -----------------------------------------------------------------------------
// Enum display labels
// -----------------------------------------------------------------------------

/** Human-readable labels for PSTR filing reasons. */
export const REASON_LABELS: Record<PstrReason, string> = {
  NO_UNDERLYING_OBLIGATION: 'No Underlying Legal/Trade Obligation',
  NOT_PROPERLY_IDENTIFIED: 'Patron Not Properly Identified',
  NOT_COMMENSURATE: 'Not Commensurate with Business/Financial Capacity',
  STRUCTURED: 'Possibly Structured to Avoid CTR',
  UNLAWFUL_ACTIVITY: 'Possibly Related to Unlawful/ML Activity',
  DEVIATION: 'Deviation from Profile/Past Transactions',
  OTHERS: 'Others',
};

/** Human-readable labels for department-level review actions. */
export const DEPARTMENT_ACTION_LABELS: Record<DepartmentAction, string> = {
  FOR_DISCUSSION: 'For Discussion',
  SUBMIT: 'Submit',
  NOTED: 'Noted',
  PENDING: 'Pending',
};

/** Human-readable labels for STR Committee final dispositions. */
export const STR_COMMITTEE_ACTION_LABELS: Record<StrCommitteeAction, string> = {
  SUBMIT_TO_AMLC: 'Submit to AMLC',
  FOR_MONITORING: 'For Monitoring',
  ARCHIVE: 'Archive',
  FOR_ADDITIONAL_ACTION: 'For Additional Action',
};

/** Human-readable labels for patron risk ratings. */
export const RISK_RATING_LABELS: Record<RiskRating, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  UNRATED: 'Unrated',
};

/** Human-readable labels for venue/location identifiers. */
export const LOCATION_LABELS: Record<LocationType, string> = {
  SEC: 'Solaire Entertainment City',
  SN: 'Solaire North',
  SOLAIRE_ONLINE: 'Solaire Online',
  MEGAFUNALO: 'MegaFunAlo',
  GILAS: 'Gilas',
};

/** Human-readable labels for application user roles. */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  compliance_officer: 'Compliance Officer',
  department_user: 'Department User',
  viewer: 'Viewer',
};

/** Human-readable labels for department types. */
export const DEPARTMENT_TYPE_LABELS: Record<DepartmentType, string> = {
  compliance: 'Compliance',
  casino_marketing: 'Casino Marketing',
  vip_marketing: 'VIP Marketing',
  aco: 'ACO',
  str_committee: 'STR Committee',
  it: 'IT',
  executive: 'Executive',
};

// -----------------------------------------------------------------------------
// Department field mapping
// Maps each department to the action and notes fields it controls on pstr_records.
// Used for field-level access control at the application layer (RLS is row-level only).
// -----------------------------------------------------------------------------

export interface DepartmentFields {
  actionField: string;
  notesField: string;
}

/** Which pstr_records columns each department is allowed to edit. */
export const DEPARTMENT_FIELD_MAP: Record<string, DepartmentFields> = {
  casino_marketing: {
    actionField: 'casino_marketing_action',
    notesField: 'casino_marketing_notes',
  },
  vip_marketing: {
    actionField: 'vip_marketing_action',
    notesField: 'vip_marketing_notes',
  },
  aco: {
    actionField: 'aco_action',
    notesField: 'aco_notes',
  },
  str_committee: {
    actionField: 'str_committee_action',
    notesField: 'pstr_committee_meeting_date',
  },
};

// -----------------------------------------------------------------------------
// Pagination defaults
// -----------------------------------------------------------------------------

// Short aliases for convenience
export const ROLE_LABELS = USER_ROLE_LABELS;
export const DEPARTMENT_LABELS = DEPARTMENT_TYPE_LABELS;
export const STR_ACTION_LABELS = STR_COMMITTEE_ACTION_LABELS;

/** Available page size options for table pagination. */
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/** Default number of rows per page. */
export const DEFAULT_PAGE_SIZE = 25;
