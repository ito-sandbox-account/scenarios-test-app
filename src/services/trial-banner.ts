/**
 * Trial banner copy generator.
 *
 * Returns a user-facing string describing the current trial status. The banner
 * is rendered in the response body of `GET /api/trial-banner` and consumed
 * directly by the client UI without further formatting.
 */

export type TrialStatus =
  | { state: "active"; daysRemaining: number }
  | { state: "ended"; daysSinceEnded: number }
  | { state: "none" };

export function buildTrialBannerMessage(status: TrialStatus): string {
  switch (status.state) {
    case "active":
      return `⏳ Your Ito free trial is active — ${status.daysRemaining} days remaining.`;
    case "ended":
      return status.daysSinceEnded > 0
        ? `⏳ Your Ito free trial has ended, because your ${status.daysSinceEnded}-day trial period ended.`
        : `⏳ Your Ito free trial has ended, because your trial period ended.`;
    case "none":
      return "";
  }
}
