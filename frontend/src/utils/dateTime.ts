const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
let currentTimezone = DEFAULT_TIMEZONE;

export function setAppTimezone(timezone: string | null | undefined): void {
  const normalized = String(timezone ?? '').trim();
  currentTimezone = normalized || DEFAULT_TIMEZONE;
}

export function getAppTimezone(): string {
  return currentTimezone;
}

export function parseApiDate(value?: string | null): Date | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  const match = DATE_ONLY_REGEX.exec(raw);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function formatDateBR(value?: string | null): string {
  if (!value) return '-';
  const raw = value.trim();
  if (!raw) return '-';
  const match = DATE_ONLY_REGEX.exec(raw);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const parsed = parseApiDate(raw);
  if (!parsed) return value;
  return parsed.toLocaleDateString('pt-BR', { timeZone: currentTimezone });
}
