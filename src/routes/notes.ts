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
    starred    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
// Backfill starred column if running on a pre-existing notes table.
try {
  db.run("ALTER TABLE notes ADD COLUMN starred INTEGER NOT NULL DEFAULT 0");
} catch {
  // Column already exists.
}

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
    starred: Boolean(row.starred),
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

// Searches user's notes by title prefix.
notesRoutes.get("/search", (c) => {
  const user = currentUser(c);
  const q = (c.req.query("q") ?? "").trim();
  if (!q) return c.json({ notes: [] });
  const escaped = q.replace(/[%_\\]/g, (m) => `\\${m}`);
  const rows = db
    .query(
      "SELECT * FROM notes WHERE user_id = ? AND title LIKE ? ESCAPE '\\' ORDER BY created_at DESC",
    )
    .all(user.id, `${escaped}%`) as Record<string, unknown>[];
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

// Fixed: now actually flips the archived column.
notesRoutes.post("/:id/archive", (c) => {
  const user = currentUser(c);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
  const result = db
    .query(
      "UPDATE notes SET archived = 1 WHERE id = ? AND user_id = ? RETURNING *",
    )
    .get(id, user.id) as Record<string, unknown> | null;
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json({ note: rowToNote(result) });
});

// BUG: this route is intentionally registered without `requireAuth` middleware
// in src/index.ts (mounted before the notesRoutes prefix). Anyone — even
// without a session — can star any note by id. Smoke test for `new_test_fail`.
export const notesStarRoute = new Hono();
notesStarRoute.post("/:id/star", (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
  const result = db
    .query(
      "UPDATE notes SET starred = 1 WHERE id = ? RETURNING *",
    )
    .get(id) as Record<string, unknown> | null;
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json({ note: rowToNote(result) });
});
