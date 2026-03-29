import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Pool } from "../db/pool.js";
import type { EventTypeRow } from "../types/index.js";

export async function findAll(pool: Pool): Promise<EventTypeRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, title, description, duration, slug, created_at
     FROM event_types
     ORDER BY created_at DESC`
  );
  return rows as EventTypeRow[];
}

export async function findById(pool: Pool, id: number): Promise<EventTypeRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, title, description, duration, slug, created_at
     FROM event_types WHERE id = :id LIMIT 1`,
    { id }
  );
  const r = rows[0];
  return r ? (r as EventTypeRow) : null;
}

export async function findBySlug(pool: Pool, slug: string): Promise<EventTypeRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, title, description, duration, slug, created_at
     FROM event_types WHERE slug = :slug LIMIT 1`,
    { slug }
  );
  const r = rows[0];
  return r ? (r as EventTypeRow) : null;
}

export async function create(
  pool: Pool,
  data: Pick<EventTypeRow, "title" | "description" | "duration" | "slug">
): Promise<number> {
  const [res] = await pool.execute<ResultSetHeader>(
    `INSERT INTO event_types (title, description, duration, slug)
     VALUES (:title, :description, :duration, :slug)`,
    {
      title: data.title,
      description: data.description,
      duration: data.duration,
      slug: data.slug,
    }
  );
  return res.insertId;
}

export async function update(
  pool: Pool,
  id: number,
  data: Partial<Pick<EventTypeRow, "title" | "description" | "duration" | "slug">>
): Promise<boolean> {
  const fields: string[] = [];
  const params: Record<string, string | number | null> = { id };

  if (data.title !== undefined) {
    fields.push("title = :title");
    params.title = String(data.title);
  }
  if (data.description !== undefined) {
    fields.push("description = :description");
    params.description = data.description === null ? null : String(data.description);
  }
  if (data.duration !== undefined) {
    fields.push("duration = :duration");
    params.duration = Number(data.duration);
  }
  if (data.slug !== undefined) {
    fields.push("slug = :slug");
    params.slug = String(data.slug);
  }
  if (fields.length === 0) return false;

  const [res] = await pool.query<ResultSetHeader>(
    `UPDATE event_types SET ${fields.join(", ")} WHERE id = :id`,
    params
  );
  return res.affectedRows > 0;
}

export async function remove(pool: Pool, id: number): Promise<boolean> {
  const [res] = await pool.execute<ResultSetHeader>(`DELETE FROM event_types WHERE id = :id`, {
    id,
  });
  return res.affectedRows > 0;
}
