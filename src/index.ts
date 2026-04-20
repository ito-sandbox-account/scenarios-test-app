import { Hono } from "hono";
import "./db";
import { authRoutes } from "./routes/auth-routes";
import { todosRoutes } from "./routes/todos";
import { tagsRoutes } from "./routes/tags";

const app = new Hono();

app.get("/", (c) => c.json({ service: "scenarios-test-app", ok: true }));
app.route("/api/auth", authRoutes);
app.route("/api/todos", todosRoutes);
app.route("/api/tags", tagsRoutes);

const port = Number(process.env.PORT ?? 3000);

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`scenarios-test-app listening on http://localhost:${port}`);
