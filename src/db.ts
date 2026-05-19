import { Database } from "bun:sqlite";

const dbPath = process.env.DATABASE_PATH ?? "./todos.db";
export const db = new Database(dbPath);

// Enable WAL for better concurrent reads.
db.run("PRAGMA journal_mode = WAL");

export function migrate(): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     TEXT NOT NULL,
      title       TEXT NOT NULL,
      completed   INTEGER NOT NULL DEFAULT 0,
      due_date    TEXT,
      created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id)`);
  db.run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      token       TEXT PRIMARY KEY,
      email       TEXT NOT NULL,
      expires_at  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

migrate();
