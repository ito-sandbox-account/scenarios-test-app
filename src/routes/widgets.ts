import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { currentUser, requireAuth } from "../auth";

export const widgetsRoutes = new Hono();
widgetsRoutes.use("*", requireAuth);

db.run(`
  CREATE TABLE IF NOT EXISTS widgets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    label      TEXT NOT NULL,
    kind       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const createWidgetInputSchema = z.object({
  label: z.string().min(1).max(120),
  kind: z.enum(["counter", "chart", "gauge"]),
});

widgetsRoutes.post("/", async (c) => {
  const user = currentUser(c);
  const body = await c.req.json().catch(() => null);
  const parsed = createWidgetInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid payload", details: parsed.error.issues }, 400);
  }
  const row = db
    .query("INSERT INTO widgets (user_id, label, kind) VALUES (?, ?, ?) RETURNING *")
    .get(user.id, parsed.data.label, parsed.data.kind) as Record<string, unknown>;
  return c.json({ widget: row }, 201);
});

widgetsRoutes.get("/", (c) => {
  const user = currentUser(c);
  const rows = db
    .query("SELECT * FROM widgets WHERE user_id = ? ORDER BY created_at DESC")
    .all(user.id);
  return c.json({ widgets: rows });
});

widgetsRoutes.delete("/:id", (c) => {
  const user = currentUser(c);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
  const result = db
    .query("DELETE FROM widgets WHERE id = ? AND user_id = ? RETURNING id")
    .get(id, user.id) as Record<string, unknown> | null;
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});
