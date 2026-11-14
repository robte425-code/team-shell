import { INTERNAL_FETCH_TIMEOUT_MS, internalAppOrigin } from "./internal-urls";

/**
 * Server only. Who HR lists as active, for "View as" pickers in the other TEAM apps, and for
 * signing in with an address outside the TEAM domains (isActiveStaffEmail).
 *
 * Asks HR's GET /api/internal/active-staff with TEAM_INTERNAL_ACCESS_SECRET. The answer is
 * kept in memory for a minute, and concurrent callers share one refresh. When HR can't be
 * asked (not configured, down, or an error) callers keep their own list rather than
 * offering nobody.
 */

const CACHE_MS = 60 * 1000;
let cached: { at: number; emails: Set<string> | null } = { at: 0, emails: null };
let pending: Promise<void> | null = null;

/** Lowercased sign-in emails of active people, straight from HR (no cache). Null when HR can't be asked. */
export async function fetchActiveEmails(env: NodeJS.ProcessEnv = process.env): Promise<Set<string> | null> {
  const secret = env.TEAM_INTERNAL_ACCESS_SECRET?.trim();
  const hr = internalAppOrigin("hr", env);
  if (!secret || !hr) return null;
  try {
    const res = await fetch(`${hr}/api/internal/active-staff`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(INTERNAL_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[active-staff] HR answered ${res.status}; View as shows everyone for now.`);
      return null;
    }
    const data = (await res.json()) as { users?: { email?: unknown }[] };
    if (!Array.isArray(data.users)) return null;
    return new Set(
      data.users.map((u) => String(u?.email ?? "").trim().toLowerCase()).filter((e) => e.includes("@"))
    );
  } catch (e) {
    console.error("[active-staff] Couldn't reach HR; View as shows everyone for now.", e instanceof Error ? e.message : e);
    return null;
  }
}

async function activeStaffEmails(): Promise<Set<string> | null> {
  if (Date.now() - cached.at > CACHE_MS) {
    if (!pending) {
      pending = fetchActiveEmails()
        .then((emails) => {
          cached = { at: Date.now(), emails };
        })
        .finally(() => {
          pending = null;
        });
    }
    await pending;
  }
  return cached.emails;
}

/** Keep only people HR lists as active; everyone, if HR couldn't be asked. */
export async function onlyActiveStaff<T>(users: T[], emailOf: (u: T) => string | null | undefined): Promise<T[]> {
  const active = await activeStaffEmails();
  if (!active) return users;
  return users.filter((u) => active.has(String(emailOf(u) ?? "").trim().toLowerCase()));
}

/**
 * Whether HR lists `email` as an active person's sign-in (work) email: true or false, or null
 * when HR can't be asked. Cached for a minute, like the rest of this file.
 *
 * For sign-in gates: someone without a TEAM mailbox (a Microsoft guest in TEAM's directory,
 * signing in with their own address) may sign in only while HR has that address as their work
 * email. Microsoft sign-in is single-tenant, so they must also be in TEAM's directory. Treat
 * null as no: an outside address is never let in on the domain rule alone.
 */
export async function isActiveStaffEmail(email: string | null | undefined): Promise<boolean | null> {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(normalized)) return false;
  const active = await activeStaffEmails();
  return active ? active.has(normalized) : null;
}
