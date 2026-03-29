import type { Request, Response } from "express";
import { pool } from "../db/pool.js";
import * as availabilityModel from "../models/availability.model.js";
import * as eventTypesModel from "../models/eventTypes.model.js";

interface AvailabilityInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
}

export async function getByEventType(req: Request, res: Response): Promise<void> {
  const eventTypeId = Number(req.params.eventTypeId);
  if (!Number.isFinite(eventTypeId)) {
    res.status(400).json({ error: "Invalid eventTypeId" });
    return;
  }
  const et = await eventTypesModel.findById(pool, eventTypeId);
  if (!et) {
    res.status(404).json({ error: "Event type not found" });
    return;
  }
  const rows = await availabilityModel.findByEventTypeId(pool, eventTypeId);
  res.json(rows);
}

export async function save(req: Request, res: Response): Promise<void> {
  const { eventTypeId, timezone, slots } = req.body ?? {};
  const id = Number(eventTypeId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "eventTypeId is required" });
    return;
  }
  const et = await eventTypesModel.findById(pool, id);
  if (!et) {
    res.status(404).json({ error: "Event type not found" });
    return;
  }
  if (!Array.isArray(slots)) {
    res.status(400).json({ error: "slots must be an array" });
    return;
  }

  const tz = typeof timezone === "string" && timezone.length > 0 ? timezone : "UTC";

  const normalized: AvailabilityInput[] = [];
  for (const s of slots as Record<string, unknown>[]) {
    const dayOfWeek = Number(s.dayOfWeek);
    const startTime = normalizeTimeString(s.startTime);
    const endTime = normalizeTimeString(s.endTime);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      res.status(400).json({ error: "Invalid dayOfWeek (0-6)" });
      return;
    }
    if (!startTime || !endTime) {
      res.status(400).json({ error: "startTime and endTime required (HH:MM or HH:MM:SS)" });
      return;
    }
    if (startTime >= endTime) {
      res.status(400).json({ error: "startTime must be before endTime" });
      return;
    }
    normalized.push({
      dayOfWeek,
      startTime,
      endTime,
      timezone: typeof s.timezone === "string" ? s.timezone : tz,
    });
  }

  await availabilityModel.replaceForEventType(
    pool,
    id,
    normalized.map((r) => ({
      day_of_week: r.dayOfWeek,
      start_time: r.startTime,
      end_time: r.endTime,
      timezone: r.timezone || tz,
    }))
  );
  res.status(204).end();
}

function normalizeTimeString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  return null;
}
