import type { Todo } from "./types";

/**
 * Returns true when the todo has a due date that is strictly in the past.
 * The "overdue" label helps the UI highlight items that need attention.
 */
export function isOverdue(todo: Todo, now: Date = new Date()): boolean {
  if (!todo.dueDate) return false;
  const due = new Date(todo.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime();
}
