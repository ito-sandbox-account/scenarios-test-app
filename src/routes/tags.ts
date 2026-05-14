import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { currentUser, requireAuth } from "../auth";
import type { Tag } from "../types";

export const tagsRoutes = new Hono();
tagsRoutes.use("*", requireAuth);

const createTagInputSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/i, "alphanumeric + dashes only"),
});

function rowToTag(row: Record<string, unknown>): Tag {
  return {
    id: row.id as number,
    userId: row.user_id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
  };
}

tagsRoutes.post("/", async (c) => {
  const user = currentUser(c);
  const body = await c.req.json().catch(() => null);
  const parsed = createTagInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid payload", details: parsed.error.issues }, 400);
  }
  const existing = db
    .query("SELECT id FROM tags WHERE user_id = ? AND name = ?")
    .get(user.id, parsed.data.name) as Record<string, unknown> | null;
  if (existing) {
    return c.json({ error: "tag already exists" }, 409);
  }
  const result = db
    .query("INSERT INTO tags (user_id, name) VALUES (?, ?) RETURNING *")
    .get(user.id, parsed.data.name) as Record<string, unknown>;
  return c.json({ tag: rowToTag(result) }, 201);
});

tagsRoutes.get("/", (c) => {
  const user = currentUser(c);
  const rows = db
    .query("SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC")
    .all(user.id) as Record<string, unknown>[];
  return c.json({ tags: rows.map(rowToTag) });
});

tagsRoutes.delete("/:id", (c) => {
  const user = currentUser(c);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
  const result = db
    .query("DELETE FROM tags WHERE id = ? AND user_id = ? RETURNING id")
    .get(id, user.id) as Record<string, unknown> | null;
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});
