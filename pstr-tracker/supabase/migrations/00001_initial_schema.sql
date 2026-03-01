-- ============================================================================
-- PSTR Tracker — Initial Schema Migration
-- Solaire Resort and Casino — Compliance Department
--
-- Purpose:  Track Preliminary Suspicious Transaction Reports (PSTRs),
--           patron risk ratings, department review workflows, and
--           AMLC request handling.
--
-- Source:   Designed from production Excel data (10,001 rows, 22 columns)
--           with 132 nature-of-transaction variations, 63+ red-flag
--           variations, and 692 unique screening values.
--
-- Date:     2026-03-01
-- ============================================================================

-- ============================================================================
-- 1. CUSTOM ENUM TYPES
-- ============================================================================

-- Reason for filing a PSTR — normalized to 7 canonical values from free-text
-- variations found in the source data.
CREATE TYPE pstr_reason AS ENUM (
    'NO_UNDERLYING_OBLIGATION',   -- "There is NO UNDERLYING legal or trade obligation, purpose or economic justification."
    'NOT_PROPERLY_IDENTIFIED',    -- "Patron IS NOT PROPERLY IDENTIFIED."
    'NOT_COMMENSURATE',           -- "Transaction IS NOT COMMENSURATE WITH THE BUSINESS OR FINANCIAL CAPACITY of the customer."
    'STRUCTURED',                 -- "Transaction is possibly STRUCTURED to attempt to avoid Covered Transaction Reporting."
    'UNLAWFUL_ACTIVITY',          -- "Transaction is possibly related to an UNLAWFUL ACTIVITY or any MONEY LAUNDERING ACTIVITY OR OFFENSE."
    'DEVIATION',                  -- "DEVIATION from patron's profile and/or past transactions"
    'OTHERS'                      -- "OTHERS (similar, analogous or identical to suspicious indicators)"
);

COMMENT ON TYPE pstr_reason IS 'Canonical PSTR filing reasons per AMLC guidelines. Maps 7 free-text variations from the source data.';

-- Department-level review action
CREATE TYPE department_action AS ENUM (
    'FOR_DISCUSSION',
    'SUBMIT',
    'NOTED',
    'PENDING'
);

COMMENT ON TYPE department_action IS 'Action taken by a reviewing department (Casino Marketing, VIP Marketing, ACO).';

-- STR Committee final disposition
CREATE TYPE str_committee_action AS ENUM (
    'SUBMIT_TO_AMLC',
    'FOR_MONITORING',
    'ARCHIVE',
    'FOR_ADDITIONAL_ACTION'
);

COMMENT ON TYPE str_committee_action IS 'Final action decided by the STR Committee.';

-- Patron risk rating
CREATE TYPE risk_rating AS ENUM (
    'HIGH',
    'MEDIUM',
    'LOW',
    'UNRATED'
);

-- Location / venue — normalized from 15 variations in the source data
CREATE TYPE location_type AS ENUM (
    'SEC',              -- Solaire Entertainment City (main property)
    'SN',               -- Solaire North
    'SOLAIRE_ONLINE',   -- Online gaming platform
    'MEGAFUNALO',       -- MegaFunAlo brand
    'GILAS'             -- Gilas venue
);

COMMENT ON TYPE location_type IS 'Normalized venue identifiers. Collapsed 15 source variations into 5 canonical values.';

-- Application user roles (stored in user_profiles, referenced in RLS)
CREATE TYPE user_role AS ENUM (
    'admin',
    'compliance_officer',
    'department_user',
    'viewer'
);

-- Department affiliation for users
CREATE TYPE department_type AS ENUM (
    'compliance',
    'casino_marketing',
    'vip_marketing',
    'aco',
    'str_committee',
    'it',
    'executive'
);


-- ============================================================================
-- 2. HELPER FUNCTIONS (used by RLS policies)
-- ============================================================================

-- Returns the role of the currently authenticated user.
-- Falls back to 'viewer' if no profile exists (defensive).
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT role FROM user_profiles WHERE id = auth.uid() AND is_active = true),
        'viewer'::user_role
    );
$$;

COMMENT ON FUNCTION get_user_role() IS 'Returns the role of the current authenticated user from user_profiles. Defaults to viewer.';

-- Returns the department of the currently authenticated user.
-- Returns NULL if no profile exists.
CREATE OR REPLACE FUNCTION get_user_department()
RETURNS department_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT department FROM user_profiles WHERE id = auth.uid() AND is_active = true;
$$;

COMMENT ON FUNCTION get_user_department() IS 'Returns the department of the current authenticated user from user_profiles.';


-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 3a. user_profiles — extends Supabase auth.users with app-specific fields
-- ---------------------------------------------------------------------------
CREATE TABLE user_profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    full_name   TEXT,
    department  department_type NOT NULL,
    role        user_role NOT NULL DEFAULT 'viewer',
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_profiles IS 'Application-level user profiles. Each row corresponds 1:1 with a Supabase auth.users entry.';

-- ---------------------------------------------------------------------------
-- 3b. patrons — casino patron master list
-- ---------------------------------------------------------------------------
CREATE TABLE patrons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patron_number   TEXT UNIQUE NOT NULL,   -- e.g. '300919500'
    last_name       TEXT NOT NULL,
    first_name      TEXT NOT NULL,
    risk_rating     risk_rating NOT NULL DEFAULT 'UNRATED',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE patrons IS 'Master patron table. patron_number is the unique business identifier from the casino management system.';
COMMENT ON COLUMN patrons.patron_number IS 'Casino-system patron ID (e.g. 300919500). Unique across all venues.';

-- ---------------------------------------------------------------------------
-- 3c. pstr_records — main PSTR tracking table (maps to Excel's 22 columns)
-- ---------------------------------------------------------------------------
CREATE TABLE pstr_records (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_no                 SERIAL,  -- auto-incrementing, maps to Excel "No." column

    -- Patron link
    patron_id                   UUID NOT NULL REFERENCES patrons(id) ON DELETE RESTRICT,

    -- Transaction details
    transaction_date            TIMESTAMPTZ,                    -- parsed from yyyymmddhhmmss
    nature_of_transaction       TEXT,                           -- 132 variations, free text
    transaction_amount          BIGINT CHECK (transaction_amount >= 0),  -- PHP, range 0–200M
    reason                      pstr_reason,
    red_flag                    TEXT,                           -- 63+ variations, free text
    compliance_notes            TEXT,

    -- Department review workflow
    casino_marketing_action     department_action,
    casino_marketing_notes      TEXT,
    vip_marketing_action        department_action,
    vip_marketing_notes         TEXT,
    aco_action                  department_action,
    aco_notes                   TEXT,

    -- STR Committee disposition
    str_committee_action        str_committee_action,
    pstr_committee_meeting_date DATE,

    -- Screening & classification
    screening                   TEXT,                           -- 692 unique values, free text
    risk_rating                 risk_rating NOT NULL DEFAULT 'UNRATED',
    location                    location_type,
    year                        INTEGER,

    -- Metadata
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by                  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE pstr_records IS 'Primary PSTR tracking table. Each row is one preliminary suspicious transaction report. Schema derived from production Excel (10,001 rows, 22 columns).';
COMMENT ON COLUMN pstr_records.sequence_no IS 'Auto-incrementing sequence number matching the Excel "No." column.';
COMMENT ON COLUMN pstr_records.transaction_amount IS 'Transaction amount in Philippine Pesos (whole number). Source data range: 0 to 200,000,000.';
COMMENT ON COLUMN pstr_records.nature_of_transaction IS 'Free-text description of transaction nature. 132 distinct variations in source data — too varied for enum.';
COMMENT ON COLUMN pstr_records.red_flag IS 'Free-text red flag indicator. 63+ distinct variations in source data.';
COMMENT ON COLUMN pstr_records.screening IS 'Screening results text. 692 unique values in source data.';

-- ---------------------------------------------------------------------------
-- 3d. amlc_requests — AMLC inbound requests (second Excel sheet, 21 rows)
-- ---------------------------------------------------------------------------
CREATE TABLE amlc_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type        TEXT,
    reference_number    TEXT,
    patron_id           UUID REFERENCES patrons(id) ON DELETE SET NULL,
    details             JSONB,          -- flexible store for the varied fields
    status              TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE amlc_requests IS 'Tracks inbound requests from AMLC (Anti-Money Laundering Council). Source: second Excel sheet, 21 rows.';
COMMENT ON COLUMN amlc_requests.details IS 'JSONB store for complex/variable fields that differ per request type.';

-- ---------------------------------------------------------------------------
-- 3e. audit_log — append-only change log for compliance trail
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    table_name      TEXT NOT NULL,
    record_id       UUID NOT NULL,
    action          TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values      JSONB,
    new_values      JSONB,
    changed_fields  TEXT[],
    user_id         UUID,
    user_email      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_log IS 'Append-only audit trail. Populated exclusively by database triggers — no direct app writes.';
COMMENT ON COLUMN audit_log.changed_fields IS 'Array of column names that changed (UPDATE only).';


-- ============================================================================
-- 4. INDEXES
-- ============================================================================

-- pstr_records — high-cardinality lookups and common filter/sort patterns
CREATE INDEX idx_pstr_records_patron_id            ON pstr_records (patron_id);
CREATE INDEX idx_pstr_records_transaction_date      ON pstr_records (transaction_date);
CREATE INDEX idx_pstr_records_reason                ON pstr_records (reason);
CREATE INDEX idx_pstr_records_location              ON pstr_records (location);
CREATE INDEX idx_pstr_records_year                  ON pstr_records (year);
CREATE INDEX idx_pstr_records_str_committee_action  ON pstr_records (str_committee_action);
CREATE INDEX idx_pstr_records_created_at            ON pstr_records (created_at);

-- patrons — last_name for search (patron_number already has unique index)
CREATE INDEX idx_patrons_last_name ON patrons (last_name);

-- audit_log — lookup by table+record, and time-range queries
CREATE INDEX idx_audit_log_table_record ON audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_created_at   ON audit_log (created_at);


-- ============================================================================
-- 5. TRIGGERS — updated_at auto-refresh
-- ============================================================================

-- Generic trigger function to set updated_at to now() on any UPDATE.
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_set_updated_at() IS 'Generic trigger function: sets updated_at = now() on every UPDATE.';

-- Apply to patrons
CREATE TRIGGER trg_patrons_updated_at
    BEFORE UPDATE ON patrons
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- Apply to pstr_records
CREATE TRIGGER trg_pstr_records_updated_at
    BEFORE UPDATE ON pstr_records
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- Apply to user_profiles
CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- Apply to amlc_requests
CREATE TRIGGER trg_amlc_requests_updated_at
    BEFORE UPDATE ON amlc_requests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();


-- ============================================================================
-- 6. TRIGGERS — audit log on pstr_records
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_pstr_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_values    JSONB;
    v_new_values    JSONB;
    v_changed       TEXT[];
    v_record_id     UUID;
    v_user_id       UUID;
    v_user_email    TEXT;
    v_key           TEXT;
BEGIN
    -- Resolve the current user from Supabase auth context.
    -- auth.uid() and auth.jwt() return NULL for service-role or
    -- trigger-only contexts; that is acceptable.
    BEGIN
        v_user_id    := auth.uid();
        v_user_email := COALESCE(
            current_setting('request.jwt.claims', true)::jsonb ->> 'email',
            NULL
        );
    EXCEPTION WHEN OTHERS THEN
        v_user_id    := NULL;
        v_user_email := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        v_record_id := NEW.id;
        v_new_values := to_jsonb(NEW);
        v_old_values := NULL;
        v_changed    := NULL;

    ELSIF TG_OP = 'UPDATE' THEN
        v_record_id  := NEW.id;
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);

        -- Compute which fields actually changed (exclude updated_at, updated_by
        -- to reduce noise — those always change on UPDATE).
        v_changed := ARRAY(
            SELECT key
            FROM jsonb_each(v_new_values) AS n(key, val)
            WHERE key NOT IN ('updated_at', 'updated_by')
              AND (
                  NOT v_old_values ? key
                  OR v_old_values -> key IS DISTINCT FROM n.val
              )
        );

        -- If nothing meaningful changed, skip the audit row.
        IF array_length(v_changed, 1) IS NULL THEN
            RETURN NEW;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        v_record_id  := OLD.id;
        v_old_values := to_jsonb(OLD);
        v_new_values := NULL;
        v_changed    := NULL;
    END IF;

    INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_fields, user_id, user_email)
    VALUES ('pstr_records', v_record_id, TG_OP, v_old_values, v_new_values, v_changed, v_user_id, v_user_email);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

COMMENT ON FUNCTION trigger_pstr_audit_log() IS 'Audit trigger for pstr_records. Captures old/new values, changed field names, and auth context on INSERT/UPDATE/DELETE.';

CREATE TRIGGER trg_pstr_records_audit
    AFTER INSERT OR UPDATE OR DELETE ON pstr_records
    FOR EACH ROW
    EXECUTE FUNCTION trigger_pstr_audit_log();


-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all application tables.
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pstr_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE amlc_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log     ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 7a. user_profiles
-- ---------------------------------------------------------------------------

-- SELECT: any authenticated user can read profiles (needed for display names, etc.)
CREATE POLICY user_profiles_select
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: admin only
CREATE POLICY user_profiles_insert
    ON user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() = 'admin');

-- UPDATE: admin only
CREATE POLICY user_profiles_update
    ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (get_user_role() = 'admin')
    WITH CHECK (get_user_role() = 'admin');

-- DELETE: admin only
CREATE POLICY user_profiles_delete
    ON user_profiles
    FOR DELETE
    TO authenticated
    USING (get_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 7b. patrons
-- ---------------------------------------------------------------------------

-- SELECT: all authenticated users
CREATE POLICY patrons_select
    ON patrons
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: admin or compliance_officer
CREATE POLICY patrons_insert
    ON patrons
    FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'compliance_officer'));

-- UPDATE: admin or compliance_officer
CREATE POLICY patrons_update
    ON patrons
    FOR UPDATE
    TO authenticated
    USING (get_user_role() IN ('admin', 'compliance_officer'))
    WITH CHECK (get_user_role() IN ('admin', 'compliance_officer'));

-- DELETE: admin only
CREATE POLICY patrons_delete
    ON patrons
    FOR DELETE
    TO authenticated
    USING (get_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 7c. pstr_records
-- ---------------------------------------------------------------------------

-- SELECT: all authenticated users
CREATE POLICY pstr_records_select
    ON pstr_records
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: admin or compliance_officer
CREATE POLICY pstr_records_insert
    ON pstr_records
    FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'compliance_officer'));

-- UPDATE: admin, compliance_officer, or department_user.
-- NOTE: Field-level restrictions for department_user (limiting them to only
-- their department's action + notes columns) cannot be enforced at the RLS
-- layer because RLS operates at row level, not column level.
-- That restriction is enforced at the application layer via Edge Functions.
CREATE POLICY pstr_records_update
    ON pstr_records
    FOR UPDATE
    TO authenticated
    USING (get_user_role() IN ('admin', 'compliance_officer', 'department_user'))
    WITH CHECK (get_user_role() IN ('admin', 'compliance_officer', 'department_user'));

-- DELETE: admin only
CREATE POLICY pstr_records_delete
    ON pstr_records
    FOR DELETE
    TO authenticated
    USING (get_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 7d. amlc_requests
-- ---------------------------------------------------------------------------

-- SELECT: all authenticated users
CREATE POLICY amlc_requests_select
    ON amlc_requests
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: admin or compliance_officer
CREATE POLICY amlc_requests_insert
    ON amlc_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'compliance_officer'));

-- UPDATE: admin or compliance_officer
CREATE POLICY amlc_requests_update
    ON amlc_requests
    FOR UPDATE
    TO authenticated
    USING (get_user_role() IN ('admin', 'compliance_officer'))
    WITH CHECK (get_user_role() IN ('admin', 'compliance_officer'));

-- DELETE: admin only
CREATE POLICY amlc_requests_delete
    ON amlc_requests
    FOR DELETE
    TO authenticated
    USING (get_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 7e. audit_log — read-only for admins, no app-level writes
-- ---------------------------------------------------------------------------

-- SELECT: admin only (compliance audit trail is sensitive)
CREATE POLICY audit_log_select
    ON audit_log
    FOR SELECT
    TO authenticated
    USING (get_user_role() = 'admin');

-- No INSERT/UPDATE/DELETE policies for authenticated role.
-- The audit trigger runs as SECURITY DEFINER and bypasses RLS,
-- so trigger-based inserts succeed while direct app inserts are blocked.


-- ============================================================================
-- 8. GRANTS
-- ============================================================================

-- Supabase manages role grants via its dashboard, but we explicitly grant
-- to the anon and authenticated roles for clarity.

-- Authenticated users need SELECT on all tables (RLS narrows further).
GRANT SELECT ON user_profiles, patrons, pstr_records, amlc_requests, audit_log TO authenticated;
GRANT INSERT, UPDATE, DELETE ON user_profiles, patrons, pstr_records, amlc_requests TO authenticated;
GRANT USAGE ON SEQUENCE pstr_records_sequence_no_seq TO authenticated;
GRANT USAGE ON SEQUENCE audit_log_id_seq TO authenticated;

-- Anon role gets nothing (PSTR data requires authentication).
-- This is the Supabase default but stated explicitly for security clarity.
REVOKE ALL ON user_profiles, patrons, pstr_records, amlc_requests, audit_log FROM anon;


-- ============================================================================
-- 9. FINAL VERIFICATION COMMENTS
-- ============================================================================

COMMENT ON SCHEMA public IS 'PSTR Tracker schema for Solaire Resort and Casino — Compliance Department. Tracks preliminary suspicious transaction reports, patron risk ratings, department review workflows, and AMLC requests.';

-- ============================================================================
-- End of migration 00001_initial_schema.sql
-- ============================================================================
