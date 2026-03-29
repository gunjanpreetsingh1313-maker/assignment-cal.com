import type { AvailabilityRow } from "../types/index.js";
import type { BookingRow } from "../types/index.js";
import { minutesToSqlTime, rangesOverlap, timeToMinutes, weekdayFromISODate } from "./time.js";

export interface SlotDto {
  startTime: string;
  endTime: string;
}

/**
 * Builds bookable slots for an event on a calendar date.
 *
 * Steps:
 * 1. Resolve weekday for the given ISO date (UTC-noon trick for stability).
 * 2. Load availability windows for that weekday; merge is not implemented — use non-overlapping rows.
 * 3. Within each window, step by event duration (minutes) as long as the full block fits before end_time.
 * 4. Drop any slot that overlaps a CONFIRMED booking on the same calendar date (minute-precision overlap).
 */
export function buildSlotsForDate(params: {
  date: string;
  durationMinutes: number;
  availability: AvailabilityRow[];
  confirmedBookings: Pick<BookingRow, "start_time" | "end_time">[];
}): SlotDto[] {
  const { date, durationMinutes, availability, confirmedBookings } = params;
  if (durationMinutes <= 0) return [];

  const dow = weekdayFromISODate(date);
  const windows = availability.filter((a) => a.day_of_week === dow);
  if (windows.length === 0) return [];

  const bookingSpans = confirmedBookings.map((b) => ({
    s: timeToMinutes(b.start_time),
    e: timeToMinutes(b.end_time),
  }));

  const slots: SlotDto[] = [];

  for (const w of windows) {
    let cursor = timeToMinutes(w.start_time);
    const end = timeToMinutes(w.end_time);
    while (cursor + durationMinutes <= end) {
      const slotStart = cursor;
      const slotEnd = cursor + durationMinutes;

      const clashes = bookingSpans.some((b) => rangesOverlap(slotStart, slotEnd, b.s, b.e));
      if (!clashes) {
        slots.push({
          startTime: minutesToSqlTime(slotStart),
          endTime: minutesToSqlTime(slotEnd),
        });
      }
      cursor = slotEnd;
    }
  }

  // Stable sort by start time
  slots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  return dedupeAdjacentSlots(slots);
}

/** If availability rows accidentally duplicate windows, remove exact duplicate start times. */
function dedupeAdjacentSlots(slots: SlotDto[]): SlotDto[] {
  const seen = new Set<string>();
  return slots.filter((s) => {
    const k = s.startTime;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
