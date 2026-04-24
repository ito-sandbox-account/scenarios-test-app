export interface User {
  id: string;
  email: string;
}

export interface Todo {
  id: number;
  userId: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  createdAt: string;
}

export interface TodoResponse extends Todo {
  isOverdue: boolean;
}

export interface SessionInfo {
  userId: string;
  email: string;
  expiresAt: number;
}
