import { Hono } from "hono";
import { db } from "../db";
import { currentUser, requireAuth } from "../auth";
import { createTodoInputSchema, patchTodoInputSchema } from "../validators";
import type { Todo } from "../types";

export const todosRoutes = new Hono();
todosRoutes.use("*", requireAuth);

function rowToTodo(row: Record<string, unknown>): Todo {
  return {
    id: row.id as number,
    userId: row.user_id as string,
    title: row.title as string,
    completed: Boolean(row.completed),
    dueDate: (row.due_date as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

todosRoutes.post("/", async (c) => {
  const user = currentUser(c);
  const body = await c.req.json().catch(() => null);
  const parsed = createTodoInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid payload", details: parsed.error.issues }, 400);
  }
  const { title, dueDate } = parsed.data;
  const result = db
    .query(
      "INSERT INTO todos (user_id, title, due_date) VALUES (?, ?, ?) RETURNING *",
    )
    .get(user.id, title, dueDate ?? null) as Record<string, unknown>;
  return c.json({ todo: rowToTodo(result) }, 201);
});

todosRoutes.get("/", (c) => {
  const user = currentUser(c);
  const completedParam = c.req.query("completed");
  let rows: Record<string, unknown>[];
  if (completedParam === "true" || completedParam === "false") {
    rows = db
      .query("SELECT * FROM todos WHERE user_id = ? AND completed = ? ORDER BY id DESC")
      .all(user.id, completedParam === "true" ? 1 : 0) as Record<string, unknown>[];
  } else {
    rows = db
      .query("SELECT * FROM todos WHERE user_id = ? ORDER BY id DESC")
      .all(user.id) as Record<string, unknown>[];
  }
  return c.json({ todos: rows.map(rowToTodo) });
});

todosRoutes.get("/:id", (c) => {
  const user = currentUser(c);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
  const row = db
    .query("SELECT * FROM todos WHERE id = ? AND user_id = ?")
    .get(id, user.id) as Record<string, unknown> | null;
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json({ todo: rowToTodo(row) });
});

todosRoutes.patch("/:id", async (c) => {
  const user = currentUser(c);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
  const body = await c.req.json().catch(() => null);
  const parsed = patchTodoInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid payload", details: parsed.error.issues }, 400);
  }
  const existing = db
    .query("SELECT * FROM todos WHERE id = ? AND user_id = ?")
    .get(id, user.id) as Record<string, unknown> | null;
  if (!existing) return c.json({ error: "not found" }, 404);

  const nextTitle = parsed.data.title ?? (existing.title as string);
  const nextCompleted =
    parsed.data.completed !== undefined
      ? parsed.data.completed
        ? 1
        : 0
      : (existing.completed as number);
  const nextDueDate =
    parsed.data.dueDate === undefined
      ? (existing.due_date as string | null)
      : parsed.data.dueDate;

  const result = db
    .query(
      "UPDATE todos SET title = ?, completed = ?, due_date = ? WHERE id = ? AND user_id = ? RETURNING *",
    )
    .get(nextTitle, nextCompleted, nextDueDate, id, user.id) as Record<string, unknown>;
  return c.json({ todo: rowToTodo(result) });
});

todosRoutes.delete("/:id", (c) => {
  const user = currentUser(c);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
  const result = db
    .query("DELETE FROM todos WHERE id = ? AND user_id = ? RETURNING id")
    .get(id, user.id) as Record<string, unknown> | null;
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});

// Legacy convenience endpoint — flips `completed` without requiring a PATCH payload.
// Kept for backward compatibility with older clients.
todosRoutes.post("/:id/toggle", (c) => {
  const user = currentUser(c);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid id" }, 400);
  const existing = db
    .query("SELECT * FROM todos WHERE id = ? AND user_id = ?")
    .get(id, user.id) as Record<string, unknown> | null;
  if (!existing) return c.json({ error: "not found" }, 404);
  const nextCompleted = (existing.completed as number) ? 0 : 1;
  const result = db
    .query(
      "UPDATE todos SET completed = ? WHERE id = ? AND user_id = ? RETURNING *",
    )
    .get(nextCompleted, id, user.id) as Record<string, unknown>;
  return c.json({ todo: rowToTodo(result) });
});
