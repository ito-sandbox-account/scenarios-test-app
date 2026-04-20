import type { Context, MiddlewareHandler } from "hono";
import type { SessionInfo, User } from "./types";

// Intentionally hardcoded — this is a sandbox, not a production app.
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_USER: User = { id: "admin", email: ADMIN_EMAIL };

// In-memory session store keyed by opaque session id.
const SESSIONS = new Map<string, SessionInfo>();
const SESSION_TTL_MS = 1000 * 60 * 60 * 24;

function createSession(user: User): string {
  const sid = crypto.randomUUID();
  SESSIONS.set(sid, {
    userId: user.id,
    email: user.email,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return sid;
}

function readSession(sid: string | undefined): SessionInfo | null {
  if (!sid) return null;
  const s = SESSIONS.get(sid);
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    SESSIONS.delete(sid);
    return null;
  }
  return s;
}

export function verifyCredentials(email: string, password: string): User | null {
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return ADMIN_USER;
  }
  return null;
}

export function loginUser(c: Context, user: User): void {
  const sid = createSession(user);
  c.header("Set-Cookie", `sid=${sid}; Path=/; HttpOnly; SameSite=Strict`);
}

export function logoutUser(c: Context): void {
  const sid = c.req.header("cookie")?.match(/sid=([^;]+)/)?.[1];
  if (sid) SESSIONS.delete(sid);
  c.header("Set-Cookie", "sid=; Path=/; Max-Age=0");
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const sid = c.req.header("cookie")?.match(/sid=([^;]+)/)?.[1];
  const session = readSession(sid);
  if (!session) {
    return c.json({ error: "unauthorized" }, 401);
  }
  c.set("user", { id: session.userId, email: session.email });
  await next();
};

export function currentUser(c: Context): User {
  return c.get("user") as User;
}
