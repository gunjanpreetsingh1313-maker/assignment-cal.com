/** Wall-clock time as minutes from midnight (integer minutes). */
export function timeToMinutes(t: string): number {
  const parts = t.split(":").map((p) => Number(p));
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const s = parts[2] ?? 0;
  return h * 60 + m + Math.floor(s / 60);
}

export function minutesToSqlTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** Half-open interval overlap in minute space: [a0,a1) vs [b0,b1) */
export function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && a1 > b0;
}

/**
 * ISO date YYYY-MM-DD → JS weekday 0=Sun..6=Sat using UTC noon to avoid DST boundary issues.
 */
export function weekdayFromISODate(dateStr: string): number {
  const [y, mo, d] = dateStr.split("-").map(Number);
  if (!y || !mo || !d) throw new Error("Invalid date");
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0)).getUTCDay();
}
