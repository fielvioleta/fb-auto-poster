/**
 * Timezone-aware date helpers built on the Intl API so we avoid pulling in a
 * heavy date library. All functions accept the IANA timezone string.
 */

/** Returns the local date as YYYY-MM-DD in the given timezone. */
export function localDateString(timezone: string, date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/** Returns the local weekday index (0 = Sunday ... 6 = Saturday) in the timezone. */
export function localWeekday(timezone: string, date: Date = new Date()): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(date);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? new Date().getDay();
}

/** True when the local day (in the timezone) is Saturday or Sunday. */
export function isWeekend(timezone: string, date: Date = new Date()): boolean {
  const day = localWeekday(timezone, date);
  return day === 0 || day === 6;
}

/** Returns the YYYY-MM month string for analytics grouping. */
export function localMonthString(timezone: string, date: Date = new Date()): string {
  return localDateString(timezone, date).slice(0, 7);
}

/** Number of whole days between two ISO date strings (a - b). */
export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.floor((a - b) / (1000 * 60 * 60 * 24));
}
