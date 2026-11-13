export type TeamAppId = "updates" | "requests" | "vocHotline" | "hr" | "payroll" | "messages";

const URL_ENV: Record<TeamAppId, string> = {
  updates: "NEXT_PUBLIC_UPDATES_URL",
  requests: "NEXT_PUBLIC_REQUESTS_URL",
  vocHotline: "NEXT_PUBLIC_VOC_HOTLINE_URL",
  hr: "NEXT_PUBLIC_HR_URL",
  payroll: "NEXT_PUBLIC_PAYROLL_URL",
  messages: "NEXT_PUBLIC_MESSAGES_URL",
};

const warned = new Set<TeamAppId>();

/**
 * Origin for server-to-server calls that carry TEAM_INTERNAL_ACCESS_SECRET.
 *
 * Unlike teamUrls() (nav links), there is no built-in default: the secret is only sent to an
 * origin this deployment was explicitly configured with, so a renamed or deleted Vercel
 * project whose old *.vercel.app name gets claimed by someone else never receives it.
 * Requires https (http only for localhost). Any path (e.g. /my-leave.html) is dropped.
 */
export function internalAppOrigin(
  app: TeamAppId,
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const name = URL_ENV[app];
  const raw = env[name]?.trim();
  let origin: string | null = null;
  if (raw) {
    try {
      const url = new URL(raw);
      const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (url.protocol === "https:" || (local && url.protocol === "http:")) origin = url.origin;
    } catch {
      origin = null;
    }
  }
  if (!origin && !warned.has(app)) {
    warned.add(app);
    console.error(`[team-shell] ${name} is not set to an https URL; skipping internal calls to ${app}.`);
  }
  return origin;
}

/** Abort internal calls that hang so a slow sibling app can't stall page renders. */
export const INTERNAL_FETCH_TIMEOUT_MS = 5000;
