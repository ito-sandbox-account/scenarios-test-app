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
      text        TEXT NOT NULL,
      completed   INTEGER NOT NULL DEFAULT 0,
      due_date    TEXT,
      priority    TEXT NOT NULL DEFAULT 'medium',
      created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const cols = db.query("PRAGMA table_info(todos)").all() as Array<{ name: string }>;
  // Backfill: rename legacy `title` column to `text` on existing installs.
  if (cols.some((c) => c.name === "title") && !cols.some((c) => c.name === "text")) {
    db.run(`ALTER TABLE todos RENAME COLUMN title TO text`);
  }
  // Backfill: add priority column if this is an existing install without it.
  if (!cols.some((c) => c.name === "priority")) {
    db.run(`ALTER TABLE todos ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'`);
  }
  db.run(`CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id)`);
}

migrate();
