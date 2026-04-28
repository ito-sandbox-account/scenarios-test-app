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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Derive the trial status from a stored expiration timestamp.
 *
 * `null` means the user never started a trial. A future expiration means an
 * active trial; a past expiration means the trial has ended. Both branches
 * compute the day delta with floor() so that the displayed copy ticks down
 * (or up) at the user's local midnight boundary.
 */
export function deriveTrialStatus(
  expiresAt: Date | null,
  now: Date = new Date(),
): TrialStatus {
  if (expiresAt === null) return { state: "none" };
  const diffMs = expiresAt.getTime() - now.getTime();
  if (diffMs > 0) {
    return { state: "active", daysRemaining: Math.max(1, Math.floor(diffMs / MS_PER_DAY)) };
  }
  return { state: "ended", daysSinceEnded: Math.floor(-diffMs / MS_PER_DAY) };
}

export function buildTrialBannerMessage(status: TrialStatus): string {
  switch (status.state) {
    case "active":
      return `⏳ Your Ito free trial is active — ${status.daysRemaining} days remaining.`;
    case "ended":
      return status.daysSinceEnded > 0
        ? `⏳ Your Ito free trial has ended, because your ${status.daysSinceEnded}-day trial period ended. Too bad, so sad.`
        : `⏳ Your Ito free trial has ended, because your trial period ended. Too bad, so sad.`;
    case "none":
      return "";
  }
}
