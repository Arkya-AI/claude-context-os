// =============================================================================
// PSTR Tracker — Utility Formatters
// Formatting functions for currency, dates, and text display.
// =============================================================================

/**
 * Formats a number as Philippine Peso currency with commas.
 * Example: formatCurrency(1500000) => "PHP 1,500,000.00"
 */
export function formatCurrency(amount: number): string {
  return `PHP ${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats an ISO date string to a human-readable date.
 * Example: formatDate("2026-03-01T14:30:00Z") => "Mar 1, 2026"
 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats an ISO date string to a human-readable date with time.
 * Example: formatDateTime("2026-03-01T14:30:00Z") => "Mar 1, 2026, 2:30 PM"
 */
export function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Parses an Excel-format date string (yyyymmddhhmmss) into a Date object.
 * The source PSTR Excel data stores transaction dates in this format.
 *
 * Example: parseExcelDate("20260301143000") => Date(2026-03-01T14:30:00)
 */
export function parseExcelDate(dateStr: string): Date {
  if (dateStr.length < 8) {
    throw new Error(`Invalid Excel date string: "${dateStr}". Expected format: yyyymmddhhmmss`);
  }

  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1; // JS months are 0-indexed
  const day = parseInt(dateStr.substring(6, 8), 10);
  const hour = dateStr.length >= 10 ? parseInt(dateStr.substring(8, 10), 10) : 0;
  const minute = dateStr.length >= 12 ? parseInt(dateStr.substring(10, 12), 10) : 0;
  const second = dateStr.length >= 14 ? parseInt(dateStr.substring(12, 14), 10) : 0;

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Sanitizes user input for use in PostgREST filter strings.
 * Escapes characters that PostgREST interprets as operators (commas, periods,
 * parentheses, backslashes) to prevent filter injection attacks.
 */
export function sanitizeSearchInput(input: string): string {
  return input.replace(/[,.*()\\]/g, '');
}

/**
 * Truncates text to a maximum length, appending an ellipsis if truncated.
 * Example: truncateText("Long compliance note here", 15) => "Long complianc..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '\u2026';
}
