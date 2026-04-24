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

/**
 * Returns the number of whole days a todo is overdue, or 0 if not overdue.
 * Useful for severity styling in the UI (e.g. red after 3+ days).
 */
export function daysOverdue(todo: Todo, now: Date = new Date()): number {
  if (!isOverdue(todo, now)) return 0;
  const due = new Date(todo.dueDate!);
  const diffMs = now.getTime() - due.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
