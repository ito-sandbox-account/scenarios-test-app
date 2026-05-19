import type { Todo } from "./types";

export function rowToTodo(row: Record<string, unknown>): Todo {
  return {
    id: row.id as number,
    userId: row.user_id as string,
    title: row.title as string,
    completed: Boolean(row.completed),
    dueDate: (row.due_date as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}
