// =============================================================================
// PSTR Tracker — Database Types
// TypeScript types matching the PostgreSQL schema (00001_initial_schema.sql)
// =============================================================================

// -----------------------------------------------------------------------------
// Enum types matching PostgreSQL enums
// -----------------------------------------------------------------------------

/** Canonical PSTR filing reasons per AMLC guidelines (7 values). */
export type PstrReason =
  | 'NO_UNDERLYING_OBLIGATION'
  | 'NOT_PROPERLY_IDENTIFIED'
  | 'NOT_COMMENSURATE'
  | 'STRUCTURED'
  | 'UNLAWFUL_ACTIVITY'
  | 'DEVIATION'
  | 'OTHERS';

/** Action taken by a reviewing department (Casino Marketing, VIP Marketing, ACO). */
export type DepartmentAction = 'FOR_DISCUSSION' | 'SUBMIT' | 'NOTED' | 'PENDING';

/** Final action decided by the STR Committee. */
export type StrCommitteeAction = 'SUBMIT_TO_AMLC' | 'FOR_MONITORING' | 'ARCHIVE' | 'FOR_ADDITIONAL_ACTION';

/** Patron risk rating. */
export type RiskRating = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRATED';

/** Normalized venue identifiers (collapsed from 15 source variations). */
export type LocationType = 'SEC' | 'SN' | 'SOLAIRE_ONLINE' | 'MEGAFUNALO' | 'GILAS';

/** Application user roles (stored in user_profiles, referenced in RLS). */
export type UserRole = 'admin' | 'compliance_officer' | 'department_user' | 'viewer';

/** Department affiliation for users. */
export type DepartmentType =
  | 'compliance'
  | 'casino_marketing'
  | 'vip_marketing'
  | 'aco'
  | 'str_committee'
  | 'it'
  | 'executive';

// -----------------------------------------------------------------------------
// Database row types
// -----------------------------------------------------------------------------

/** Casino patron master record (patrons table). */
export interface Patron {
  id: string;
  patron_number: string;
  last_name: string;
  first_name: string;
  risk_rating: RiskRating;
  created_at: string;
  updated_at: string;
}

/** Primary PSTR tracking record (pstr_records table). */
export interface PstrRecord {
  id: string;
  sequence_no: number;

  // Patron link
  patron_id: string;

  // Transaction details
  transaction_date: string | null;
  nature_of_transaction: string | null;
  transaction_amount: number | null;
  reason: PstrReason | null;
  red_flag: string | null;
  compliance_notes: string | null;

  // Department review workflow
  casino_marketing_action: DepartmentAction | null;
  casino_marketing_notes: string | null;
  vip_marketing_action: DepartmentAction | null;
  vip_marketing_notes: string | null;
  aco_action: DepartmentAction | null;
  aco_notes: string | null;

  // STR Committee disposition
  str_committee_action: StrCommitteeAction | null;
  pstr_committee_meeting_date: string | null;

  // Screening & classification
  screening: string | null;
  risk_rating: RiskRating;
  location: LocationType | null;
  year: number | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;

  // Joined patron data (optional, populated by queries with joins)
  patron?: Patron;
}

/** AMLC inbound request record (amlc_requests table). */
export interface AmlcRequest {
  id: string;
  request_type: string | null;
  reference_number: string | null;
  patron_id: string | null;
  details: Record<string, unknown> | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

/** Append-only audit trail entry (audit_log table). */
export interface AuditLogEntry {
  id: number;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[] | null;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

/** Application-level user profile (user_profiles table). */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  department: DepartmentType;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Query / filter types
// -----------------------------------------------------------------------------

/** Filter parameters for PSTR record queries. */
export interface PstrFilters {
  search?: string;
  reason?: PstrReason[];
  location?: LocationType[];
  year?: number[];
  risk_rating?: RiskRating[];
  str_committee_action?: StrCommitteeAction[];
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
}

/** Pagination and sorting parameters. */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Generic paginated response wrapper. */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// -----------------------------------------------------------------------------
// Dashboard types
// -----------------------------------------------------------------------------

/** Key performance indicators for the PSTR dashboard. */
export interface DashboardKpi {
  totalPstrs: number;
  highRiskCount: number;
  pendingActions: number;
  monthlyVolume: number;
  submittedToAmlc: number;
  forMonitoring: number;
  archived: number;
}

/** Single data point for bar/pie charts. */
export interface ChartDataPoint {
  label: string;
  value: number;
}

/** Monthly trend data for line/area charts. */
export interface MonthlyTrend {
  month: string;
  count: number;
  amount: number;
}
