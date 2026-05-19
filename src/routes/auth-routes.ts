import { Hono } from "hono";
import { db } from "../db";
import {
  loginInputSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from "../validators";
import { currentUser, loginUser, logoutUser, requireAuth, verifyCredentials } from "../auth";

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60;

export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid payload", details: parsed.error.issues }, 400);
  }
  const user = verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    return c.json({ error: "invalid credentials" }, 401);
  }
  loginUser(c, user);
  return c.json({ user });
});

authRoutes.post("/logout", (c) => {
  logoutUser(c);
  return c.json({ ok: true });
});

authRoutes.get("/me", requireAuth, (c) => {
  return c.json({ user: currentUser(c) });
});

authRoutes.post("/password-reset/request", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = passwordResetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid payload", details: parsed.error.issues }, 400);
  }
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString();
  db.query(
    "INSERT INTO password_resets (token, email, expires_at) VALUES (?, ?, ?)",
  ).run(token, parsed.data.email, expiresAt);
  // Sandbox: returning the token directly instead of sending an email.
  return c.json({ ok: true, token, expiresAt });
});

authRoutes.post("/password-reset/confirm", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = passwordResetConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid payload", details: parsed.error.issues }, 400);
  }
  const row = db
    .query("SELECT * FROM password_resets WHERE token = ?")
    .get(parsed.data.token) as Record<string, unknown> | null;
  if (!row) return c.json({ error: "invalid token" }, 400);
  const expiresAt = new Date(row.expires_at as string).getTime();
  if (expiresAt < Date.now()) {
    return c.json({ error: "token expired" }, 400);
  }
  // In a real app we'd update the password here. Sandbox no-op.
  return c.json({ ok: true });
});
