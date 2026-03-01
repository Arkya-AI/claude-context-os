import type { DepartmentAction, StrCommitteeAction, RiskRating } from '../../types/database';

type BadgeVariant = 'default' | 'submitted' | 'pending' | 'archived' | 'high-risk' | 'for-discussion' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}

export function ActionBadge({ action }: { action: DepartmentAction | null }) {
  if (!action) return <Badge variant="default">—</Badge>;
  const map: Record<DepartmentAction, BadgeVariant> = {
    SUBMIT: 'submitted',
    FOR_DISCUSSION: 'for-discussion',
    NOTED: 'default',
    PENDING: 'pending',
  };
  const labels: Record<DepartmentAction, string> = {
    SUBMIT: 'Submit',
    FOR_DISCUSSION: 'For Discussion',
    NOTED: 'Noted',
    PENDING: 'Pending',
  };
  return <Badge variant={map[action]}>{labels[action]}</Badge>;
}

export function StrActionBadge({ action }: { action: StrCommitteeAction | null }) {
  if (!action) return <Badge variant="default">—</Badge>;
  const map: Record<StrCommitteeAction, BadgeVariant> = {
    SUBMIT_TO_AMLC: 'danger',
    FOR_MONITORING: 'warning',
    ARCHIVE: 'archived',
    FOR_ADDITIONAL_ACTION: 'for-discussion',
  };
  const labels: Record<StrCommitteeAction, string> = {
    SUBMIT_TO_AMLC: 'Submit to AMLC',
    FOR_MONITORING: 'For Monitoring',
    ARCHIVE: 'Archive',
    FOR_ADDITIONAL_ACTION: 'For Additional Action',
  };
  return <Badge variant={map[action]}>{labels[action]}</Badge>;
}

export function RiskBadge({ rating }: { rating: RiskRating }) {
  const map: Record<RiskRating, BadgeVariant> = {
    HIGH: 'high-risk',
    MEDIUM: 'warning',
    LOW: 'success',
    UNRATED: 'default',
  };
  return <Badge variant={map[rating]}>{rating}</Badge>;
}
