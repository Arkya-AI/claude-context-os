-- ============================================================================
-- PSTR Tracker — Security Hardening Migration
-- Solaire Resort and Casino — Compliance Department
--
-- Purpose:  Enforce field-level access via triggers, add server-side
--           validation, expand audit coverage, harden user_profiles
--           visibility, add dashboard aggregation RPCs, and fix the
--           transaction_amount data type.
--
-- Depends:  00001_initial_schema.sql
-- Date:     2026-03-01
-- ============================================================================


-- ============================================================================
-- M1: Change transaction_amount from BIGINT to NUMERIC(15,2)
-- ============================================================================
-- Philippine Peso amounts can have centavo precision. NUMERIC(15,2) supports
-- up to 9,999,999,999,999.99 — well beyond the 200M max seen in source data.
-- The existing CHECK constraint (transaction_amount >= 0) carries over
-- automatically; we will re-add it explicitly in H1 for clarity.
-- ============================================================================

ALTER TABLE pstr_records
    ALTER COLUMN transaction_amount TYPE NUMERIC(15,2)
    USING transaction_amount::NUMERIC(15,2);

COMMENT ON COLUMN pstr_records.transaction_amount
    IS 'Transaction amount in Philippine Pesos (NUMERIC 15,2). Source data range: 0 to 200,000,000.';


-- ============================================================================
-- M2: Composite index for year + location + risk_rating
-- ============================================================================
-- Supports the most common dashboard filter combination.
-- ============================================================================

CREATE INDEX idx_pstr_records_year_location_risk
    ON pstr_records (year, location, risk_rating);


-- ============================================================================
-- C2: BEFORE UPDATE trigger on pstr_records — field-level access enforcement
-- ============================================================================
-- RLS can only enforce row-level access. This trigger enforces column-level
-- restrictions for department_user role by restoring OLD values for columns
-- outside the user's permitted set.
--
-- Department field mapping:
--   casino_marketing → casino_marketing_action, casino_marketing_notes
--   vip_marketing    → vip_marketing_action, vip_marketing_notes
--   aco              → aco_action, aco_notes
--   str_committee    → str_committee_action, pstr_committee_meeting_date
--
-- admin / compliance_officer: unrestricted (all columns)
-- viewer: all updates rejected (should already be blocked by RLS, but
--         defense-in-depth)
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_enforce_field_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role       user_role;
    v_department department_type;
    -- Capture the submitted (NEW) values for department columns before we
    -- overwrite them with OLD values.
    v_casino_marketing_action     department_action;
    v_casino_marketing_notes      TEXT;
    v_vip_marketing_action        department_action;
    v_vip_marketing_notes         TEXT;
    v_aco_action                  department_action;
    v_aco_notes                   TEXT;
    v_str_committee_action        str_committee_action;
    v_pstr_committee_meeting_date DATE;
BEGIN
    v_role := get_user_role();

    -- Admin and compliance_officer: allow all column updates
    IF v_role IN ('admin', 'compliance_officer') THEN
        RETURN NEW;
    END IF;

    -- Viewer: reject all updates (defense-in-depth; RLS should also block)
    IF v_role = 'viewer' THEN
        RAISE EXCEPTION 'Users with viewer role are not permitted to update records.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- department_user: allow only their department's columns
    IF v_role = 'department_user' THEN
        v_department := get_user_department();

        IF v_department IS NULL THEN
            RAISE EXCEPTION 'Department user has no department assigned.'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        -- Step 1: Capture submitted department column values
        v_casino_marketing_action     := NEW.casino_marketing_action;
        v_casino_marketing_notes      := NEW.casino_marketing_notes;
        v_vip_marketing_action        := NEW.vip_marketing_action;
        v_vip_marketing_notes         := NEW.vip_marketing_notes;
        v_aco_action                  := NEW.aco_action;
        v_aco_notes                   := NEW.aco_notes;
        v_str_committee_action        := NEW.str_committee_action;
        v_pstr_committee_meeting_date := NEW.pstr_committee_meeting_date;

        -- Step 2: Restore ALL columns to OLD values
        NEW.id                          := OLD.id;
        NEW.sequence_no                 := OLD.sequence_no;
        NEW.patron_id                   := OLD.patron_id;
        NEW.transaction_date            := OLD.transaction_date;
        NEW.nature_of_transaction       := OLD.nature_of_transaction;
        NEW.transaction_amount          := OLD.transaction_amount;
        NEW.reason                      := OLD.reason;
        NEW.red_flag                    := OLD.red_flag;
        NEW.compliance_notes            := OLD.compliance_notes;
        NEW.screening                   := OLD.screening;
        NEW.risk_rating                 := OLD.risk_rating;
        NEW.location                    := OLD.location;
        NEW.year                        := OLD.year;
        NEW.created_at                  := OLD.created_at;
        NEW.created_by                  := OLD.created_by;
        -- Restore all department columns to OLD
        NEW.casino_marketing_action     := OLD.casino_marketing_action;
        NEW.casino_marketing_notes      := OLD.casino_marketing_notes;
        NEW.vip_marketing_action        := OLD.vip_marketing_action;
        NEW.vip_marketing_notes         := OLD.vip_marketing_notes;
        NEW.aco_action                  := OLD.aco_action;
        NEW.aco_notes                   := OLD.aco_notes;
        NEW.str_committee_action        := OLD.str_committee_action;
        NEW.pstr_committee_meeting_date := OLD.pstr_committee_meeting_date;

        -- Step 3: Re-apply ONLY the permitted columns for this department
        IF v_department = 'casino_marketing' THEN
            NEW.casino_marketing_action := v_casino_marketing_action;
            NEW.casino_marketing_notes  := v_casino_marketing_notes;

        ELSIF v_department = 'vip_marketing' THEN
            NEW.vip_marketing_action := v_vip_marketing_action;
            NEW.vip_marketing_notes  := v_vip_marketing_notes;

        ELSIF v_department = 'aco' THEN
            NEW.aco_action := v_aco_action;
            NEW.aco_notes  := v_aco_notes;

        ELSIF v_department = 'str_committee' THEN
            NEW.str_committee_action        := v_str_committee_action;
            NEW.pstr_committee_meeting_date := v_pstr_committee_meeting_date;

        ELSE
            -- Departments without explicit column mappings (compliance, it,
            -- executive) cannot modify any columns when acting as department_user.
            -- All columns remain at OLD values.
            NULL;
        END IF;
    END IF;

    -- updated_at and updated_by are always allowed to change (handled by
    -- the separate trigger_set_updated_at trigger).
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_enforce_field_access()
    IS 'BEFORE UPDATE trigger on pstr_records. Enforces column-level access for department_user role by restoring OLD values for non-permitted columns. Admin and compliance_officer are unrestricted. Viewer is rejected.';

-- This trigger must fire BEFORE the updated_at trigger so that updated_at
-- still gets set even after column restoration. Use a name that sorts
-- before trg_pstr_records_updated_at.
CREATE TRIGGER trg_pstr_records_field_access
    BEFORE UPDATE ON pstr_records
    FOR EACH ROW
    EXECUTE FUNCTION trigger_enforce_field_access();


-- ============================================================================
-- H1: Server-Side Validation via CHECK constraints
-- ============================================================================
-- transaction_amount >= 0 already exists from initial schema but was on the
-- BIGINT column. The ALTER TYPE above preserved it. We add the remaining
-- constraints.
-- ============================================================================

-- Year must be within a reasonable range
ALTER TABLE pstr_records
    ADD CONSTRAINT chk_pstr_year
    CHECK (year BETWEEN 2018 AND 2040);

-- Text length limits — prevent abuse / data corruption on free-text fields.
-- 10,000 characters is generous for compliance notes but prevents megabyte
-- payloads.
ALTER TABLE pstr_records
    ADD CONSTRAINT chk_compliance_notes_length
    CHECK (length(compliance_notes) <= 10000);

ALTER TABLE pstr_records
    ADD CONSTRAINT chk_casino_marketing_notes_length
    CHECK (length(casino_marketing_notes) <= 10000);

ALTER TABLE pstr_records
    ADD CONSTRAINT chk_vip_marketing_notes_length
    CHECK (length(vip_marketing_notes) <= 10000);

ALTER TABLE pstr_records
    ADD CONSTRAINT chk_aco_notes_length
    CHECK (length(aco_notes) <= 10000);

ALTER TABLE pstr_records
    ADD CONSTRAINT chk_screening_length
    CHECK (length(screening) <= 10000);

ALTER TABLE pstr_records
    ADD CONSTRAINT chk_red_flag_length
    CHECK (length(red_flag) <= 10000);

ALTER TABLE pstr_records
    ADD CONSTRAINT chk_nature_of_transaction_length
    CHECK (length(nature_of_transaction) <= 10000);


-- ============================================================================
-- H2: Audit Triggers on patrons, user_profiles, and amlc_requests
-- ============================================================================
-- Generic audit function that accepts the table name via TG_TABLE_NAME.
-- Follows the same pattern as trigger_pstr_audit_log() but is reusable.
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_generic_audit_log()
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
BEGIN
    -- Resolve the current user from Supabase auth context
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
        v_record_id  := NEW.id;
        v_new_values := to_jsonb(NEW);
        v_old_values := NULL;
        v_changed    := NULL;

    ELSIF TG_OP = 'UPDATE' THEN
        v_record_id  := NEW.id;
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);

        -- Compute which fields actually changed (exclude updated_at to reduce noise)
        v_changed := ARRAY(
            SELECT key
            FROM jsonb_each(v_new_values) AS n(key, val)
            WHERE key NOT IN ('updated_at')
              AND (
                  NOT v_old_values ? key
                  OR v_old_values -> key IS DISTINCT FROM n.val
              )
        );

        -- If nothing meaningful changed, skip the audit row
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
    VALUES (TG_TABLE_NAME, v_record_id, TG_OP, v_old_values, v_new_values, v_changed, v_user_id, v_user_email);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

COMMENT ON FUNCTION trigger_generic_audit_log()
    IS 'Generic audit trigger function. Logs INSERT/UPDATE/DELETE to audit_log using TG_TABLE_NAME for the table identifier. Reusable across multiple tables.';

-- patrons audit trigger
CREATE TRIGGER trg_patrons_audit
    AFTER INSERT OR UPDATE OR DELETE ON patrons
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generic_audit_log();

-- user_profiles audit trigger
CREATE TRIGGER trg_user_profiles_audit
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generic_audit_log();

-- amlc_requests audit trigger
CREATE TRIGGER trg_amlc_requests_audit
    AFTER INSERT OR UPDATE OR DELETE ON amlc_requests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generic_audit_log();


-- ============================================================================
-- H5: Restrict user_profiles SELECT for Non-Admins
-- ============================================================================
-- Drop the existing permissive SELECT policy and replace with:
--   - Admins: can see all profiles
--   - Non-admins: can only see their own profile
-- ============================================================================

-- Drop the existing overly-permissive policy
DROP POLICY IF EXISTS user_profiles_select ON user_profiles;

-- Admins can see all profiles
CREATE POLICY user_profiles_select_admin
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (get_user_role() = 'admin');

-- Non-admins can only see their own profile
CREATE POLICY user_profiles_select_own
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Create a VIEW for displaying user directory info (name, department)
-- accessible to all authenticated users. This replaces the blanket SELECT
-- that was previously needed for header components and name displays.
CREATE VIEW user_directory AS
    SELECT
        id,
        full_name,
        department
    FROM user_profiles
    WHERE is_active = true;

-- By default, PostgreSQL views run as the view owner (postgres), which
-- bypasses RLS on the underlying table. This is intentional here: the view
-- only exposes id, full_name, and department — no sensitive columns like
-- email, role, or is_active.

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON user_directory TO authenticated;

-- Revoke from anon
REVOKE ALL ON user_directory FROM anon;

COMMENT ON VIEW user_directory
    IS 'Public-facing user directory exposing only id, full_name, and department for all active users. Bypasses user_profiles RLS intentionally — only non-sensitive columns are exposed.';


-- ============================================================================
-- H7: Dashboard Aggregation via RPC Functions
-- ============================================================================
-- These functions run as SECURITY INVOKER so RLS is respected. They
-- aggregate data server-side to avoid fetching all records to the client.
-- ============================================================================

-- 1. Reason distribution
CREATE OR REPLACE FUNCTION get_reason_distribution()
RETURNS TABLE(reason pstr_reason, count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        pr.reason,
        COUNT(*)::BIGINT AS count
    FROM pstr_records pr
    WHERE pr.reason IS NOT NULL
    GROUP BY pr.reason
    ORDER BY count DESC;
$$;

COMMENT ON FUNCTION get_reason_distribution()
    IS 'Dashboard RPC: Returns count of PSTR records grouped by filing reason. Respects RLS via SECURITY INVOKER.';

-- 2. Location distribution
CREATE OR REPLACE FUNCTION get_location_distribution()
RETURNS TABLE(location location_type, count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        pr.location,
        COUNT(*)::BIGINT AS count
    FROM pstr_records pr
    WHERE pr.location IS NOT NULL
    GROUP BY pr.location
    ORDER BY count DESC;
$$;

COMMENT ON FUNCTION get_location_distribution()
    IS 'Dashboard RPC: Returns count of PSTR records grouped by location/venue. Respects RLS via SECURITY INVOKER.';

-- 3. STR Committee action distribution
CREATE OR REPLACE FUNCTION get_str_action_distribution()
RETURNS TABLE(action str_committee_action, count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        pr.str_committee_action AS action,
        COUNT(*)::BIGINT AS count
    FROM pstr_records pr
    WHERE pr.str_committee_action IS NOT NULL
    GROUP BY pr.str_committee_action
    ORDER BY count DESC;
$$;

COMMENT ON FUNCTION get_str_action_distribution()
    IS 'Dashboard RPC: Returns count of PSTR records grouped by STR Committee action. Respects RLS via SECURITY INVOKER.';

-- 4. Yearly comparison
CREATE OR REPLACE FUNCTION get_yearly_comparison()
RETURNS TABLE(year INT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        pr.year,
        COUNT(*)::BIGINT AS count
    FROM pstr_records pr
    WHERE pr.year IS NOT NULL
    GROUP BY pr.year
    ORDER BY pr.year;
$$;

COMMENT ON FUNCTION get_yearly_comparison()
    IS 'Dashboard RPC: Returns count of PSTR records grouped by year. Respects RLS via SECURITY INVOKER.';

-- 5. Monthly trends (grouped by YYYY-MM from transaction_date)
CREATE OR REPLACE FUNCTION get_monthly_trends()
RETURNS TABLE(month TEXT, count BIGINT, total_amount BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        to_char(pr.transaction_date, 'YYYY-MM') AS month,
        COUNT(*)::BIGINT AS count,
        COALESCE(SUM(pr.transaction_amount), 0)::BIGINT AS total_amount
    FROM pstr_records pr
    WHERE pr.transaction_date IS NOT NULL
    GROUP BY to_char(pr.transaction_date, 'YYYY-MM')
    ORDER BY month;
$$;

COMMENT ON FUNCTION get_monthly_trends()
    IS 'Dashboard RPC: Returns monthly PSTR count and total transaction amount grouped by YYYY-MM. Respects RLS via SECURITY INVOKER.';


-- ============================================================================
-- GRANTS for RPC functions
-- ============================================================================
-- All dashboard functions are accessible to authenticated users.
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_reason_distribution()      TO authenticated;
GRANT EXECUTE ON FUNCTION get_location_distribution()    TO authenticated;
GRANT EXECUTE ON FUNCTION get_str_action_distribution()  TO authenticated;
GRANT EXECUTE ON FUNCTION get_yearly_comparison()        TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_trends()           TO authenticated;

-- Revoke from anon
REVOKE EXECUTE ON FUNCTION get_reason_distribution()     FROM anon;
REVOKE EXECUTE ON FUNCTION get_location_distribution()   FROM anon;
REVOKE EXECUTE ON FUNCTION get_str_action_distribution() FROM anon;
REVOKE EXECUTE ON FUNCTION get_yearly_comparison()       FROM anon;
REVOKE EXECUTE ON FUNCTION get_monthly_trends()          FROM anon;


-- ============================================================================
-- End of migration 00002_security_hardening.sql
-- ============================================================================
