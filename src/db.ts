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
      archived    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const cols = db.query("PRAGMA table_info(todos)").all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === "archived")) {
    db.run(`ALTER TABLE todos ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`);
  }
  db.run(`CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_todos_archived ON todos(user_id, archived)`);
}

migrate();
