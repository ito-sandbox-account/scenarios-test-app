import { Hono } from "hono";
import { loginInputSchema } from "../validators";
import { currentUser, loginUser, logoutUser, requireAuth, verifyCredentials } from "../auth";

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
