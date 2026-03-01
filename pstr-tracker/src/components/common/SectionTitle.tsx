interface SectionTitleProps {
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionTitle({ children, action }: SectionTitleProps) {
  return (
    <div className="section-title-container">
      <h2 className="section-title">{children}</h2>
      {action && <div className="section-title-action">{action}</div>}
    </div>
  );
}
