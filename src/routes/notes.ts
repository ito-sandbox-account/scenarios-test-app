import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { currentUser, requireAuth } from "../auth";

export const notesRoutes = new Hono();
notesRoutes.use("*", requireAuth);

db.run(`
  CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT,
    archived   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const createNoteInputSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(10_000).optional(),
});

function rowToNote(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    userId: row.user_id as string,
    title: row.title as string,
    body: (row.body as string | null) ?? null,
    archived: Boolean(row.archived),
    createdAt: row.created_at as string,
  };
}

notesRoutes.post("/", async (c) => {
  const user = currentUser(c);
  const body = await c.req.json().catch(() => null);
  const parsed = createNoteInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid payload", details: parsed.error.issues }, 400);
  }
  const row = db
    .query("INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?) RETURNING *")
    .get(user.id, parsed.data.title, parsed.data.body ?? null) as Record<string, unknown>;
  return c.json({ note: rowToNote(row) }, 201);
});

notesRoutes.get("/", (c) => {
  const user = currentUser(c);
  const rows = db
    .query("SELECT * FROM notes WHERE user_id = ? AND archived = 0 ORDER BY created_at DESC")
    .all(user.id) as Record<string, unknown>[];
  return c.json({ notes: rows.map(rowToNote) });
});

// BUG: returns all notes, not just archived ones — the WHERE clause is wrong.
// This endpoint will be removed in commit 2 to exercise dropped_obsolete.
notesRoutes.get("/archived", (c) => {
  const user = currentUser(c);
  const rows = db
    .query("SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC")
    .all(user.id) as Record<string, unknown>[];
  return c.json({ notes: rows.map(rowToNote) });
});

notesRoutes.get("/:id", (c) => {
  const user = currentUser(c);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
  const row = db
    .query("SELECT * FROM notes WHERE id = ? AND user_id = ?")
    .get(id, user.id) as Record<string, unknown> | null;
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json({ note: rowToNote(row) });
});

notesRoutes.delete("/:id", (c) => {
  const user = currentUser(c);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
  const result = db
    .query("DELETE FROM notes WHERE id = ? AND user_id = ? RETURNING id")
    .get(id, user.id) as Record<string, unknown> | null;
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});

// BUG: returns ok but never updates the archived column.
// Commit 2 will fix this by actually running the UPDATE.
notesRoutes.post("/:id/archive", (c) => {
  const user = currentUser(c);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
  const row = db
    .query("SELECT id FROM notes WHERE id = ? AND user_id = ?")
    .get(id, user.id) as Record<string, unknown> | null;
  if (!row) return c.json({ error: "not found" }, 404);
  // intentionally missing: UPDATE notes SET archived = 1 WHERE id = ? AND user_id = ?
  return c.json({ ok: true });
});
