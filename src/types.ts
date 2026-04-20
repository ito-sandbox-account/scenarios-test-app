export interface User {
  id: string;
  email: string;
}

export type Priority = "low" | "medium" | "high";

export interface Todo {
  id: number;
  userId: string;
  text: string;
  completed: boolean;
  dueDate: string | null;
  priority: Priority;
  createdAt: string;
}

export interface SessionInfo {
  userId: string;
  email: string;
  expiresAt: number;
}
