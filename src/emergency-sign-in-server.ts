import { INTERNAL_FETCH_TIMEOUT_MS, internalAppOrigin, type TeamAppId } from "./internal-urls";

/**
 * Server only. Emergency sign-in, for when Microsoft sign-in is down: HR sends a
 * one-time code to the person's personal email and checks it. Every app asks HR's
 * /api/internal/emergency-sign-in with TEAM_INTERNAL_ACCESS_SECRET; HR keeps the
 * codes and the on/off switch (HR admins turn it on from HR's Employees page for a set
 * time; no redeploy).
 *
 * A verified code only says who the person is. The app's own sign-in rules
 * (its NextAuth signIn callback) still decide whether they get in.
 */

export type EmergencySendStatus =
  | "sent"
  | "off"
  | "invalid"
  | "limited"
  | "unknown"
  | "no_email"
  | "failed"
  | "unreachable";

function hrEndpoint(env: NodeJS.ProcessEnv): { url: string; secret: string } | null {
  const secret = env.TEAM_INTERNAL_ACCESS_SECRET?.trim();
  const hr = internalAppOrigin("hr", env);
  if (!secret || !hr) return null;
  return { url: `${hr}/api/internal/emergency-sign-in`, secret };
}

const STATUS_CACHE_MS = 30 * 1000;
// The status gates every sign-in page, so a slow HR mustn't hold it up for long.
const STATUS_TIMEOUT_MS = 2500;
let statusCache: { at: number; enabled: boolean } = { at: 0, enabled: false };

/** Whether HR has emergency sign-in switched on. Cached for 30 seconds; false when HR can't be asked. */
export async function emergencySignInEnabledRemote(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  if (Date.now() - statusCache.at < STATUS_CACHE_MS) return statusCache.enabled;
  const hr = hrEndpoint(env);
  let enabled = false;
  if (hr) {
    try {
      const res = await fetch(hr.url, {
        headers: { Authorization: `Bearer ${hr.secret}` },
        cache: "no-store",
        signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
      });
      if (res.ok) enabled = ((await res.json()) as { enabled?: boolean }).enabled === true;
    } catch {
      enabled = false;
    }
  }
  statusCache = { at: Date.now(), enabled };
  return enabled;
}

async function postToHr<T>(body: Record<string, unknown>, env: NodeJS.ProcessEnv): Promise<T | null> {
  const hr = hrEndpoint(env);
  if (!hr) return null;
  try {
    const res = await fetch(hr.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${hr.secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(INTERNAL_FETCH_TIMEOUT_MS * 2),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** How long a sign-in with an emergency code lasts, whatever the app's usual session length. */
export const EMERGENCY_SESSION_MS = 12 * 60 * 60 * 1000;

/**
 * For the NextAuth jwt callback (pass its token and account). Marks a sign-in made with
 * an emergency code, and says when that session must end: 12 hours after signing in, or
 * as soon as HR's switch is off (or HR can't be asked), so turning it off after an outage
 * also ends the sessions it let in. Microsoft sign-ins are never affected.
 */
export async function emergencySessionEnded(
  token: Record<string, unknown>,
  account: { provider?: string } | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  if (account) {
    if (account.provider === "emergency-code") token.emergencyUntil = Date.now() + EMERGENCY_SESSION_MS;
    else delete token.emergencyUntil;
  }
  const until = token.emergencyUntil;
  if (typeof until !== "number") return false;
  if (Date.now() >= until) return true;
  return !(await emergencySignInEnabledRemote(env));
}

/** Ask HR to email a code for `app`. Never throws; "unreachable" when HR couldn't be asked. */
export async function requestEmergencyCodeRemote(
  input: { email: unknown; app: TeamAppId; ip?: string | null },
  env: NodeJS.ProcessEnv = process.env
): Promise<EmergencySendStatus> {
  const result = await postToHr<{ status?: EmergencySendStatus }>(
    { action: "send", email: String(input.email ?? ""), app: input.app, ip: input.ip ?? null },
    env
  );
  return result?.status ?? "unreachable";
}

/** Check a code with HR. Null unless it's right; then the work email and HR's name for them. */
export async function verifyEmergencyCodeRemote(
  input: { email: unknown; app: TeamAppId; code: unknown; ip?: string | null },
  env: NodeJS.ProcessEnv = process.env
): Promise<{ email: string; name: string | null } | null> {
  const result = await postToHr<{ ok?: boolean; email?: string; name?: string | null }>(
    {
      action: "verify",
      email: String(input.email ?? ""),
      app: input.app,
      code: String(input.code ?? ""),
      ip: input.ip ?? null,
    },
    env
  );
  if (!result?.ok || !result.email) return null;
  return { email: result.email, name: result.name ?? null };
}

/**
 * The caller's IP from the x-forwarded-for header Vercel sets, for HR's rate limits. Takes a
 * Headers object (route handlers) or a plain header map (NextAuth's authorize req.headers).
 */
export function clientIpFrom(
  headers: { get(name: string): string | null } | Record<string, unknown> | null | undefined
): string | null {
  if (!headers) return null;
  const raw =
    typeof (headers as { get?: unknown }).get === "function"
      ? (headers as { get(name: string): string | null }).get("x-forwarded-for")
      : (headers as Record<string, unknown>)["x-forwarded-for"];
  const first = String(raw ?? "").split(",")[0].trim();
  return first || null;
}
