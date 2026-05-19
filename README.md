# scenarios-test-app

A synthetic Hono + SQLite todo API used as a sandbox for [qaito](https://github.com/demox-labs/qaito)'s test-plan-agent scenario benchmarks. **Not a production application** — its purpose is to host a series of deliberately-constructed pull requests that exercise specific behaviors of the test-plan pipeline (retests, obsolete classifications, merited retests, rebase fallback, revert handling, etc.).

## Runtime

- Bun 1.1+
- Hono web framework
- Bun's built-in `bun:sqlite` for persistence (`todos.db` in the repo root)

## Endpoints

### Auth

- `POST /api/auth/login` — body: `{ "email", "password" }` → 200 + session cookie on success
- `POST /api/auth/logout` — clears session
- `GET /api/me` — returns the current user (auth-required)
- `POST /api/auth/password-reset/request` — body: `{ "email" }` → creates reset token (1hr TTL)
- `POST /api/auth/password-reset/confirm` — body: `{ "token", "password" }` → validates token

### Todos (auth-required)

- `POST /api/todos` — create, body: `{ "title", "dueDate?" }`
- `GET /api/todos` — list current user's todos (optional `?completed=true|false`)
- `GET /api/todos/:id` — fetch one
- `PATCH /api/todos/:id` — update any of `title`, `completed`, `dueDate`
- `DELETE /api/todos/:id` — delete
- `POST /api/todos/:id/toggle` — flip `completed` (legacy convenience endpoint)

## Development

```bash
bun install
bun run dev    # http://localhost:3000
```

A hardcoded admin account exists for local testing: `admin@example.com` / `admin123`. There is no user registration — this app is intentionally single-user.

## Scenario branches

Each PR on this repo exercises a specific test-plan scenario. See individual PR descriptions for what they're designed to test.
