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

export const safeFormatDate = (dateStr?: string | null, formatStr: string = 'dd/MM/yyyy', fallback: string = '-'): string => {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) return fallback;
  try {
    const parsed = parseISO(dateStr.trim());
    if (isNaN(parsed.getTime())) return dateStr;
    return format(parsed, formatStr);
  } catch {
    return dateStr || fallback;
  }
};

export const safeGetDaysRemaining = (dateStr?: string | null): number => {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) return 999;
  try {
    const parsed = parseISO(dateStr.trim());
    if (isNaN(parsed.getTime())) return 999;
    return differenceInDays(parsed, new Date());
  } catch {
    return 999;
  }
};
