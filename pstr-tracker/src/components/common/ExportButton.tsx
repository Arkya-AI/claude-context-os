interface ExportButtonProps {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}

export function ExportButton({ onClick, loading = false, label = 'Export' }: ExportButtonProps) {
  return (
    <button
      className="btn btn--secondary"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? 'Exporting...' : label}
    </button>
  );
}
