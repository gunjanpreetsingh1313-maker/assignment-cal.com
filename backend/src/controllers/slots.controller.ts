import type { Request, Response } from "express";
import { pool } from "../db/pool.js";
import * as availabilityModel from "../models/availability.model.js";
import * as bookingsModel from "../models/bookings.model.js";
import * as eventTypesModel from "../models/eventTypes.model.js";
import { buildSlotsForDate } from "../utils/slots.js";

export async function getSlots(req: Request, res: Response): Promise<void> {
  const eventTypeId = Number(req.query.eventTypeId);
  const date = typeof req.query.date === "string" ? req.query.date : "";
  if (!Number.isFinite(eventTypeId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "eventTypeId and date (YYYY-MM-DD) are required" });
    return;
  }

  const et = await eventTypesModel.findById(pool, eventTypeId);
  if (!et) {
    res.status(404).json({ error: "Event type not found" });
    return;
  }

  const availability = await availabilityModel.findByEventTypeId(pool, eventTypeId);
  const confirmed = await bookingsModel.findConfirmedForDateAndEvent(pool, eventTypeId, date);

  const slots = buildSlotsForDate({
    date,
    durationMinutes: et.duration,
    availability,
    confirmedBookings: confirmed,
  });

  res.json({ eventType: et, slots });
}
