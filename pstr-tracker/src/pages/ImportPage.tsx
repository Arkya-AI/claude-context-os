import { useState, useCallback } from 'react';
import { SectionTitle } from '../components/common/SectionTitle';
import { ExportButton } from '../components/common/ExportButton';

interface PreviewRow {
  [key: string]: string | number | null;
}

export function ImportPage() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exporting, setExporting] = useState(false);

  // ---------------------------------------------------------------------------
  // File handling
  // ---------------------------------------------------------------------------
  const handleFile = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      alert('Please upload an Excel file (.xlsx or .xls).');
      return;
    }

    setFile(selectedFile);
    setImportStatus('idle');
    setImportProgress(0);

    try {
      // Dynamic import of exceljs for client-side parsing
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const buffer = await selectedFile.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        alert('No worksheets found in the uploaded file.');
        return;
      }

      // Extract headers from first row
      const headers: string[] = [];
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value ?? `Column ${colNumber}`);
      });
      setPreviewColumns(headers);

      // Extract first 20 rows for preview
      const rows: PreviewRow[] = [];
      const maxPreviewRows = 20;
      for (let rowNum = 2; rowNum <= Math.min(worksheet.rowCount, maxPreviewRows + 1); rowNum++) {
        const row = worksheet.getRow(rowNum);
        const rowData: PreviewRow = {};
        let hasData = false;
        headers.forEach((header, i) => {
          const cell = row.getCell(i + 1);
          const value = cell.value;
          if (value !== null && value !== undefined) hasData = true;
          rowData[header] =
            typeof value === 'object' && value !== null
              ? String(value)
              : (value as string | number | null);
        });
        if (hasData) rows.push(rowData);
      }
      setPreviewData(rows);
    } catch (err) {
      console.error('Failed to parse Excel file:', err);
      alert('Failed to parse the uploaded file. Please ensure it is a valid Excel file.');
      setFile(null);
      setPreviewData([]);
      setPreviewColumns([]);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) handleFile(selectedFile);
    },
    [handleFile]
  );

  // ---------------------------------------------------------------------------
  // Import handler (stub — actual import logic to be built later)
  // ---------------------------------------------------------------------------
  const handleImport = useCallback(async () => {
    if (!file || previewData.length === 0) return;

    setImporting(true);
    setImportStatus('idle');
    setImportProgress(0);

    try {
      // Import functionality is under development.
      // Records will be validated and upserted via Supabase Edge Function.
      setImportStatus('success');
    } catch {
      setImportStatus('error');
    } finally {
      setImporting(false);
    }
  }, [file, previewData]);

  // ---------------------------------------------------------------------------
  // Export handler (stub)
  // ---------------------------------------------------------------------------
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // TODO: Implement actual export via Supabase query + ExcelJS/CSV generation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert(`Export as ${exportFormat.toUpperCase()} — coming soon.`);
    } finally {
      setExporting(false);
    }
  }, [exportFormat]);

  // ---------------------------------------------------------------------------
  // Clear / reset
  // ---------------------------------------------------------------------------
  const handleClear = useCallback(() => {
    setFile(null);
    setPreviewData([]);
    setPreviewColumns([]);
    setImportProgress(0);
    setImportStatus('idle');
  }, []);

  return (
    <div>
      <SectionTitle>Import / Export</SectionTitle>

      {/* Import Section */}
      <div className="card mb-lg">
        <div className="card__header">
          <h3 className="card__title">Import PSTR Data</h3>
          {file && (
            <button className="btn btn--ghost btn--sm" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>

        <div className="card__body">
          {/* Drop zone */}
          {!file && (
            <div
              className="form-group"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                border: `2px dashed ${dragOver ? '#E84C22' : '#e0ddd4'}`,
                borderRadius: 8,
                padding: '3rem 2rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: dragOver ? 'rgba(232, 76, 34, 0.04)' : '#f9f8f6',
                transition: 'all 150ms ease',
              }}
            >
              <p style={{ fontWeight: 600, color: '#505046', marginBottom: 8 }}>
                Drag and drop your Excel file here
              </p>
              <p style={{ fontSize: '0.875rem', color: '#8a8a7e', marginBottom: 16 }}>
                Supported format: .xlsx
              </p>
              <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer' }}>
                Browse Files
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInput}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}

          {/* File info */}
          {file && (
            <div className="flex items-center gap-md mb-md">
              <span style={{ fontWeight: 600, color: '#505046' }}>{file.name}</span>
              <span style={{ fontSize: '0.75rem', color: '#8a8a7e' }}>
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
              {previewData.length > 0 && (
                <span className="badge badge--submitted">
                  {previewData.length} rows previewed
                </span>
              )}
            </div>
          )}

          {/* Preview table */}
          {previewData.length > 0 && previewColumns.length > 0 && (
            <div className="data-table-wrapper mb-md" style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table className="data-table data-table--compact">
                <thead>
                  <tr>
                    <th>#</th>
                    {previewColumns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i}>
                      <td style={{ color: '#8a8a7e' }}>{i + 1}</td>
                      {previewColumns.map((col) => (
                        <td key={col}>
                          {row[col] !== null && row[col] !== undefined
                            ? String(row[col])
                            : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Import progress */}
          {importing && (
            <div className="mb-md">
              <div
                style={{
                  width: '100%',
                  height: 8,
                  backgroundColor: '#EFECE1',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${importProgress}%`,
                    height: '100%',
                    backgroundColor: '#E84C22',
                    borderRadius: 4,
                    transition: 'width 200ms ease',
                  }}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#8a8a7e', marginTop: 4 }}>
                Importing... {importProgress}%
              </p>
            </div>
          )}

          {/* Import status */}
          {importStatus === 'success' && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(0, 128, 0, 0.08)',
                borderRadius: 8,
                color: '#008000',
                fontWeight: 600,
                fontSize: '0.875rem',
                marginBottom: 16,
              }}
            >
              File parsed successfully. Import to database is under development — contact IT for bulk data loads.
            </div>
          )}

          {importStatus === 'error' && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(178, 38, 0, 0.08)',
                borderRadius: 8,
                color: '#B22600',
                fontWeight: 600,
                fontSize: '0.875rem',
                marginBottom: 16,
              }}
            >
              Import failed. Please check the file format and try again.
            </div>
          )}

          {/* Import button */}
          {file && previewData.length > 0 && !importing && importStatus !== 'success' && (
            <button className="btn btn--primary" onClick={handleImport}>
              Import Data
            </button>
          )}
        </div>
      </div>

      {/* Export Section */}
      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Export PSTR Data</h3>
        </div>
        <div className="card__body">
          <p style={{ fontSize: '0.875rem', color: '#8a8a7e', marginBottom: 16 }}>
            Export PSTR records with optional filters. Choose your preferred format below.
          </p>

          <div className="flex items-center gap-md">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="export-format">Format</label>
              <select
                id="export-format"
                className="form-select"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'xlsx' | 'csv')}
                style={{ width: 160 }}
              >
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV (.csv)</option>
              </select>
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <ExportButton
                onClick={handleExport}
                loading={exporting}
                label={`Export as ${exportFormat.toUpperCase()}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
