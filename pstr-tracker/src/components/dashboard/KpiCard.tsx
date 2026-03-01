interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor?: string;
}

export function KpiCard({ label, value, subtitle, accentColor }: KpiCardProps) {
  return (
    <div
      className="kpi-card"
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
    >
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
    </div>
  );
}
