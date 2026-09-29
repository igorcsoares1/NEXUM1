import { format, parseISO, differenceInDays } from 'date-fns';

export const processCurrencyInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const numberValue = parseInt(digits, 10) / 100;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numberValue);
};

export const parseCurrencyToNumber = (value: string | undefined | null): number => {
  if (!value) return 0;
  const clean = value.toString().replace(/[R$\s]/g, '');
  if (!clean) return 0;
  if (clean.includes(',')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return parseFloat(clean) || 0;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

/**
 * Safely parses any date string (ISO YYYY-MM-DD, Brazilian DD/MM/YYYY, ISO timestamp, etc.)
 */
export const safeParseDate = (dateStr?: string | null): Date | null => {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) return null;
  const clean = dateStr.trim();

  // Match ISO YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const parts = clean.substring(0, 10).split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Match Brazilian DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const brMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    let year = parseInt(brMatch[3], 10);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback to parseISO or standard Date parsing
  try {
    const parsed = parseISO(clean);
    if (!isNaN(parsed.getTime())) return parsed;
  } catch {}

  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Normalizes any date into HTML5 <input type="date"> value (YYYY-MM-DD).
 */
export const normalizeDateForInput = (dateStr?: string | null): string => {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) return '';
  const d = safeParseDate(dateStr);
  if (!d) return '';
  return format(d, 'yyyy-MM-dd');
};

/**
 * Extracts a date from a text string such as a validity range (e.g. "01/01/2026 - 10/10/2026" -> "2026-10-10").
 */
export const extractDateFromText = (text?: string | null): string => {
  if (!text || typeof text !== 'string') return '';
  const matches = [...text.matchAll(/(\d{4}-\d{2}-\d{2})|(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/g)];
  if (matches.length > 0) {
    // Choose the last matched date in the text (which corresponds to end/expiry date in a range)
    const lastMatch = matches[matches.length - 1][0];
    return normalizeDateForInput(lastMatch);
  }
  return '';
};

export const safeFormatDate = (dateStr?: string | null, formatStr: string = 'dd/MM/yyyy', fallback: string = '-'): string => {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) return fallback;
  const d = safeParseDate(dateStr);
  if (!d) return dateStr || fallback;
  return format(d, formatStr);
};

export const safeGetDaysRemaining = (dateStr?: string | null): number => {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) return 999;
  const d = safeParseDate(dateStr);
  if (!d) return 999;
  return differenceInDays(d, new Date());
};
