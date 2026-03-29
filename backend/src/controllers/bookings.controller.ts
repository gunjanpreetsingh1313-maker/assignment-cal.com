import type { Request, Response } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../db/pool.js";
import * as bookingsModel from "../models/bookings.model.js";
import * as eventTypesModel from "../models/eventTypes.model.js";
import { buildSlotsForDate } from "../utils/slots.js";
import * as availabilityModel from "../models/availability.model.js";
import { minutesToSqlTime, rangesOverlap, timeToMinutes } from "../utils/time.js";

export async function list(_req: Request, res: Response): Promise<void> {
  const rows = await bookingsModel.findAllWithEvent(pool);
  res.json(rows);
}

export async function create(req: Request, res: Response): Promise<void> {
  const { eventTypeId, date, startTime, name, email } = req.body ?? {};
  const etId = Number(eventTypeId);
  const dateStr = typeof date === "string" ? date : "";
  const start = normalizeTime(typeof startTime === "string" ? startTime : "");
  if (!Number.isFinite(etId) || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !start) {
    res.status(400).json({ error: "eventTypeId, date (YYYY-MM-DD), startTime, name, email required" });
    return;
  }
  if (!name || !email) {
    res.status(400).json({ error: "name and email required" });
    return;
  }

  const et = await eventTypesModel.findById(pool, etId);
  if (!et) {
    res.status(404).json({ error: "Event type not found" });
    return;
  }

  const availability = await availabilityModel.findByEventTypeId(pool, etId);
  const confirmed = await bookingsModel.findConfirmedForDateAndEvent(pool, etId, dateStr);
  const allowed = buildSlotsForDate({
    date: dateStr,
    durationMinutes: et.duration,
    availability,
    confirmedBookings: confirmed,
  });
  const isAllowed = allowed.some((s) => s.startTime === start);
  if (!isAllowed) {
    res.status(409).json({ error: "Slot no longer available" });
    return;
  }

  const endTime = minutesToSqlTime(timeToMinutes(start) + et.duration);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Serialize bookings per event type to prevent concurrent double booking.
    await conn.execute(`SELECT id FROM event_types WHERE id = ? FOR UPDATE`, [etId]);

    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT start_time, end_time FROM bookings
       WHERE event_type_id = ? AND date = ? AND status = 'CONFIRMED'`,
      [etId, dateStr]
    );
    const startM = timeToMinutes(start);
    const overlap = (rows as { start_time: string; end_time: string }[]).some((b) =>
      rangesOverlap(startM, startM + et.duration, timeToMinutes(b.start_time), timeToMinutes(b.end_time))
    );
    if (overlap) {
      await conn.rollback();
      res.status(409).json({ error: "Slot just taken — pick another time" });
      return;
    }

    const insertId = await bookingsModel.insertBooking(conn, {
      name: String(name),
      email: String(email),
      date: dateStr,
      start_time: start,
      end_time: endTime,
      event_type_id: etId,
    });
    await conn.commit();
    res.status(201).json({
      id: insertId,
      eventTitle: et.title,
      date: dateStr,
      startTime: start,
      endTime,
      status: "CONFIRMED" as const,
    });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function patch(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { status } = req.body ?? {};
  if (status !== "CANCELLED" && status !== "CONFIRMED") {
    res.status(400).json({ error: "status must be CANCELLED or CONFIRMED" });
    return;
  }
  const ok = await bookingsModel.updateStatus(pool, id, status);
  if (!ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ok: true });
}

function normalizeTime(t: string): string | null {
  const s = t.trim();
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  return null;
}
