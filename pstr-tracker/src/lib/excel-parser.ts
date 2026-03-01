import ExcelJS from 'exceljs';
import { parseExcelDate } from './formatters';
import type { PstrReason, LocationType, DepartmentAction, StrCommitteeAction, RiskRating } from '../types/database';

export interface ParsedPstrRow {
  sequence_no: number;
  patron_number: string;
  last_name: string;
  first_name: string;
  transaction_date: Date | null;
  nature_of_transaction: string | null;
  transaction_amount: number | null;
  reason: PstrReason | null;
  red_flag: string | null;
  compliance_notes: string | null;
  casino_marketing_action: DepartmentAction | null;
  casino_marketing_notes: string | null;
  vip_marketing_action: DepartmentAction | null;
  vip_marketing_notes: string | null;
  aco_action: DepartmentAction | null;
  aco_notes: string | null;
  str_committee_action: StrCommitteeAction | null;
  pstr_committee_meeting_date: Date | null;
  screening: string | null;
  risk_rating: RiskRating;
  location: LocationType | null;
  year: number | null;
}

export interface ParseResult {
  records: ParsedPstrRow[];
  errors: Array<{ row: number; field: string; message: string }>;
  stats: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    uniquePatrons: number;
  };
}

const REASON_MAP: Record<string, PstrReason> = {
  'there is no underlying': 'NO_UNDERLYING_OBLIGATION',
  'patron is not properly identified': 'NOT_PROPERLY_IDENTIFIED',
  'not commensurate': 'NOT_COMMENSURATE',
  'structured': 'STRUCTURED',
  'unlawful activity': 'UNLAWFUL_ACTIVITY',
  'money laundering': 'UNLAWFUL_ACTIVITY',
  'deviation': 'DEVIATION',
  'others': 'OTHERS',
  'other': 'OTHERS',
};

const LOCATION_MAP: Record<string, LocationType> = {
  'sec': 'SEC',
  'sn': 'SN',
  'solaire online': 'SOLAIRE_ONLINE',
  'megafunalo': 'MEGAFUNALO',
  'mf': 'MEGAFUNALO',
  'gilas': 'GILAS',
};

const ACTION_MAP: Record<string, DepartmentAction> = {
  'submit': 'SUBMIT',
  'for discussion': 'FOR_DISCUSSION',
  'noted': 'NOTED',
  'pending': 'PENDING',
};

const STR_ACTION_MAP: Record<string, StrCommitteeAction> = {
  'submit to amlc': 'SUBMIT_TO_AMLC',
  'for monitoring': 'FOR_MONITORING',
  'archive': 'ARCHIVE',
  'for additional action': 'FOR_ADDITIONAL_ACTION',
};

function normalizeReason(raw: string | null | undefined): PstrReason | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  for (const [key, value] of Object.entries(REASON_MAP)) {
    if (lower.includes(key)) return value;
  }
  return 'OTHERS';
}

function normalizeLocation(raw: string | null | undefined): LocationType | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  // Handle combined locations — take the first one
  for (const [key, value] of Object.entries(LOCATION_MAP)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

function normalizeAction(raw: string | null | undefined): DepartmentAction | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  for (const [key, value] of Object.entries(ACTION_MAP)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

function normalizeStrAction(raw: string | null | undefined): StrCommitteeAction | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  for (const [key, value] of Object.entries(STR_ACTION_MAP)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

function cellToString(cell: ExcelJS.CellValue): string | null {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === 'object' && 'result' in cell) {
    return String((cell as { result: unknown }).result);
  }
  const str = String(cell).trim();
  return str === '' || str === '-' || str === '0' ? null : str;
}

function cellToNumber(cell: ExcelJS.CellValue): number | null {
  if (cell === null || cell === undefined) return null;
  const str = String(cell).replace(/,/g, '').trim();
  const num = Number(str);
  return isNaN(num) ? null : num;
}

function cellToDate(cell: ExcelJS.CellValue): Date | null {
  if (cell === null || cell === undefined) return null;
  if (cell instanceof Date) return cell;
  const str = String(cell).trim();
  if (str.length >= 8 && /^\d+$/.test(str)) {
    try {
      return parseExcelDate(str);
    } catch {
      return null;
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('No worksheet found in file');

  const records: ParsedPstrRow[] = [];
  const errors: ParseResult['errors'] = [];
  const patronSet = new Set<string>();
  let totalRows = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    totalRows++;

    const patronNumber = cellToString(row.getCell(2).value);
    const lastName = cellToString(row.getCell(3).value);
    const firstName = cellToString(row.getCell(4).value);

    if (!patronNumber) {
      errors.push({ row: rowNumber, field: 'Patron Number', message: 'Missing patron number' });
      return;
    }
    if (!lastName) {
      errors.push({ row: rowNumber, field: 'Last Name', message: 'Missing last name' });
      return;
    }

    patronSet.add(patronNumber);

    const record: ParsedPstrRow = {
      sequence_no: cellToNumber(row.getCell(1).value) ?? rowNumber - 1,
      patron_number: patronNumber,
      last_name: lastName,
      first_name: firstName ?? '',
      transaction_date: cellToDate(row.getCell(5).value),
      nature_of_transaction: cellToString(row.getCell(6).value),
      transaction_amount: cellToNumber(row.getCell(7).value),
      reason: normalizeReason(cellToString(row.getCell(8).value)),
      red_flag: cellToString(row.getCell(9).value),
      compliance_notes: cellToString(row.getCell(10).value),
      casino_marketing_action: normalizeAction(cellToString(row.getCell(11).value)),
      casino_marketing_notes: cellToString(row.getCell(12).value),
      vip_marketing_action: normalizeAction(cellToString(row.getCell(13).value)),
      vip_marketing_notes: cellToString(row.getCell(14).value),
      aco_action: normalizeAction(cellToString(row.getCell(15).value)),
      aco_notes: cellToString(row.getCell(16).value),
      str_committee_action: normalizeStrAction(cellToString(row.getCell(17).value)),
      pstr_committee_meeting_date: cellToDate(row.getCell(18).value),
      screening: cellToString(row.getCell(19).value),
      risk_rating: (cellToString(row.getCell(20).value)?.toUpperCase() as RiskRating) ?? 'UNRATED',
      location: normalizeLocation(cellToString(row.getCell(21).value)),
      year: cellToNumber(row.getCell(22).value),
    };

    // Validate risk_rating
    if (!['HIGH', 'MEDIUM', 'LOW', 'UNRATED'].includes(record.risk_rating)) {
      record.risk_rating = 'UNRATED';
    }

    records.push(record);
  });

  return {
    records,
    errors,
    stats: {
      totalRows,
      validRows: records.length,
      errorRows: errors.length,
      uniquePatrons: patronSet.size,
    },
  };
}

export async function exportToExcel(
  records: Array<Record<string, unknown>>,
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('PSTR Records');

  if (records.length === 0) {
    throw new Error('No records to export');
  }

  // Set columns from first record keys
  const columns = Object.keys(records[0]).map(key => ({
    header: key.replace(/_/g, ' ').toUpperCase(),
    key,
    width: 20,
  }));
  sheet.columns = columns;

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FFFFF8F0' },
  };

  // Add data
  for (const record of records) {
    sheet.addRow(record);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
