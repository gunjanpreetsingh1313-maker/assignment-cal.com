import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Pool } from "../db/pool.js";
import type { AvailabilityRow } from "../types/index.js";

export async function findByEventTypeId(pool: Pool, eventTypeId: number): Promise<AvailabilityRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, day_of_week, start_time, end_time, timezone, event_type_id
     FROM availability
     WHERE event_type_id = :eventTypeId
     ORDER BY day_of_week, start_time`,
    { eventTypeId }
  );
  return (rows as AvailabilityRow[]).map((r) => ({
    ...r,
    start_time: normalizeTime(r.start_time as string),
    end_time: normalizeTime(r.end_time as string),
  }));
}

/** Replace for insert: delete all rows for event type then bulk insert */
export async function replaceForEventType(
  pool: Pool,
  eventTypeId: number,
  rows: Omit<AvailabilityRow, "id" | "event_type_id">[]
): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(`DELETE FROM availability WHERE event_type_id = ?`, [eventTypeId]);
    for (const r of rows) {
      await conn.execute(
        `INSERT INTO availability (day_of_week, start_time, end_time, timezone, event_type_id)
         VALUES (?, ?, ?, ?, ?)`,
        [r.day_of_week, r.start_time, r.end_time, r.timezone, eventTypeId]
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

function normalizeTime(t: string): string {
  if (t.length === 8) return t;
  if (t.length === 5) return `${t}:00`;
  return t;
}
