import type { Request, Response } from "express";
import { pool } from "../db/pool.js";
import * as eventTypesModel from "../models/eventTypes.model.js";

export async function list(req: Request, res: Response): Promise<void> {
  const slug = typeof req.query.slug === "string" ? req.query.slug.trim() : "";
  if (slug) {
    const row = await eventTypesModel.findBySlug(pool, slug);
    if (!row) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json(row);
    return;
  }
  const rows = await eventTypesModel.findAll(pool);
  res.json(rows);
}

export async function create(req: Request, res: Response): Promise<void> {
  const { title, description, duration, slug } = req.body ?? {};
  if (!title || !slug || typeof duration !== "number") {
    res.status(400).json({ error: "title, slug, and duration are required" });
    return;
  }
  try {
    const id = await eventTypesModel.create(pool, {
      title: String(title),
      description: description != null ? String(description) : null,
      duration: Number(duration),
      slug: String(slug),
    });
    res.status(201).json({ id });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "Slug already exists" });
      return;
    }
    throw e;
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { title, description, duration, slug } = req.body ?? {};
  try {
    const ok = await eventTypesModel.update(pool, id, {
      ...(title !== undefined && { title: String(title) }),
      ...(description !== undefined && { description: String(description) }),
      ...(duration !== undefined && { duration: Number(duration) }),
      ...(slug !== undefined && { slug: String(slug) }),
    });
    if (!ok) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ok: true });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "Slug already exists" });
      return;
    }
    throw e;
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const ok = await eventTypesModel.remove(pool, id);
  if (!ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).end();
}
