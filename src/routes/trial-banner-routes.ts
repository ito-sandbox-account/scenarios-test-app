import { Hono } from "hono";
import {
  buildTrialBannerMessage,
  deriveTrialStatus,
  type TrialStatus,
} from "../services/trial-banner";

export const trialBannerRoutes = new Hono();

trialBannerRoutes.get("/", (c) => {
  const expiresAtRaw = c.req.query("expiresAt");
  if (expiresAtRaw !== undefined) {
    const expiresAt = expiresAtRaw === "null" ? null : new Date(expiresAtRaw);
    if (expiresAt !== null && Number.isNaN(expiresAt.getTime())) {
      return c.json({ error: "invalid expiresAt" }, 400);
    }
    const status = deriveTrialStatus(expiresAt);
    return c.json({ message: buildTrialBannerMessage(status) });
  }

  const stateParam = c.req.query("state") ?? "none";
  const days = Number(c.req.query("days") ?? "0");

  let status: TrialStatus;
  switch (stateParam) {
    case "active":
      status = { state: "active", daysRemaining: Number.isFinite(days) ? days : 0 };
      break;
    case "ended":
      status = { state: "ended", daysSinceEnded: Number.isFinite(days) ? days : 0 };
      break;
    default:
      status = { state: "none" };
  }

  return c.json({ message: buildTrialBannerMessage(status) });
});
