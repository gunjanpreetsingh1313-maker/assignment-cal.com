import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Pool } from "../db/pool.js";
import type { BookingRow, BookingStatus, BookingWithEvent } from "../types/index.js";

export async function findAllWithEvent(pool: Pool): Promise<BookingWithEvent[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT b.id, b.name, b.email, b.date, b.start_time, b.end_time,
            b.event_type_id, b.status, b.created_at,
            e.title AS event_title, e.slug AS event_slug, e.duration
     FROM bookings b
     INNER JOIN event_types e ON e.id = b.event_type_id
     ORDER BY b.date DESC, b.start_time DESC`
  );
  return (rows as BookingWithEvent[]).map(normalizeBookingRow);
}

export async function findConfirmedForDateAndEvent(
  pool: Pool,
  eventTypeId: number,
  date: string
): Promise<BookingRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, email, date, start_time, end_time, event_type_id, status, created_at
     FROM bookings
     WHERE event_type_id = :eventTypeId AND date = :d AND status = 'CONFIRMED'`,
    { eventTypeId, d: date }
  );
  return (rows as BookingRow[]).map((r) => normalizeBookingRow(r) as BookingRow);
}

export async function updateStatus(
  pool: Pool,
  id: number,
  status: BookingStatus
): Promise<boolean> {
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE bookings SET status = :status WHERE id = :id`,
    { id, status }
  );
  return res.affectedRows > 0;
}

/**
 * Insert inside a transaction after locking conflicting rows (see controller).
 */
export async function insertBooking(
  conn: import("mysql2/promise").PoolConnection,
  data: {
    name: string;
    email: string;
    date: string;
    start_time: string;
    end_time: string;
    event_type_id: number;
  }
): Promise<number> {
  const [res] = await conn.execute<ResultSetHeader>(
    `INSERT INTO bookings (name, email, date, start_time, end_time, event_type_id, status)
     VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED')`,
    [
      data.name,
      data.email,
      data.date,
      data.start_time,
      data.end_time,
      data.event_type_id,
    ]
  );
  return res.insertId;
}

function normalizeBookingRow<T extends BookingRow | BookingWithEvent>(r: T): T {
  const rawDate = r.date as unknown;
  const dateStr =
    rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(r.date).slice(0, 10);
  return {
    ...r,
    date: dateStr,
    start_time: normalizeTime(String(r.start_time)),
    end_time: normalizeTime(String(r.end_time)),
  };
}

function normalizeTime(t: string): string {
  if (t.length === 8) return t;
  if (t.length === 5) return `${t}:00`;
  return t;
}
