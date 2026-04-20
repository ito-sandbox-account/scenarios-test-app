import type { Todo } from "./types";

/**
 * Returns true when the todo has a due date that is strictly in the past
 * AND is not already completed. Completed todos should never be flagged as
 * overdue — the user already addressed them.
 */
export function isOverdue(todo: Todo, now: Date = new Date()): boolean {
  if (todo.completed) return false;
  if (!todo.dueDate) return false;
  const due = new Date(todo.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime();
}
