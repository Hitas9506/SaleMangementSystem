export function toNumber(value: number | string | { toNumber: () => number } | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object' && 'toNumber' in value) {
    return value.toNumber();
  }

  return Number(value);
}

export function toIso(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function parsePositiveInt(value: unknown, fallback: number, max?: number): number {
  const parsed = Number(value);
  const safe = Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  return max ? Math.min(safe, max) : safe;
}
