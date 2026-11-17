import { INTERNAL_FETCH_TIMEOUT_MS, internalAppOrigin } from "./internal-urls";

/**
 * Server only. Who HR lists as active, for "View as" pickers in the other TEAM apps, for
 * signing in with an address outside the TEAM domains (isActiveStaffEmail), and for everyone's
 * circle color (avatarColorsByEmail).
 *
 * Asks HR's GET /api/internal/active-staff with TEAM_INTERNAL_ACCESS_SECRET. The answer is
 * kept in memory for a minute, and concurrent callers share one refresh. When HR can't be
 * asked (not configured, down, or an error) callers keep their own list rather than
 * offering nobody.
 */

const CACHE_MS = 60 * 1000;

type ActiveStaff = { emails: Set<string>; colors: Record<string, string> };

let cached: { at: number; staff: ActiveStaff | null } = { at: 0, staff: null };
let pending: Promise<void> | null = null;

const HEX = /^#[0-9a-f]{6}$/;

/** HR's active staff (no cache): sign-in emails, and each one's circle color. Null when HR can't be asked. */
async function fetchActiveStaff(env: NodeJS.ProcessEnv = process.env): Promise<ActiveStaff | null> {
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
    const data = (await res.json()) as { users?: { email?: unknown; avatarColor?: unknown }[] };
    if (!Array.isArray(data.users)) return null;
    const emails = new Set<string>();
    const colors: Record<string, string> = {};
    for (const u of data.users) {
      const email = String(u?.email ?? "").trim().toLowerCase();
      if (!email.includes("@")) continue;
      emails.add(email);
      const color = String(u?.avatarColor ?? "").trim().toLowerCase();
      if (HEX.test(color)) colors[email] = color;
    }
    return { emails, colors };
  } catch (e) {
    console.error("[active-staff] Couldn't reach HR; View as shows everyone for now.", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Lowercased sign-in emails of active people, straight from HR (no cache). Null when HR can't be asked. */
export async function fetchActiveEmails(env: NodeJS.ProcessEnv = process.env): Promise<Set<string> | null> {
  return (await fetchActiveStaff(env))?.emails ?? null;
}

async function activeStaff(): Promise<ActiveStaff | null> {
  if (Date.now() - cached.at > CACHE_MS) {
    if (!pending) {
      pending = fetchActiveStaff()
        .then((staff) => {
          cached = { at: Date.now(), staff };
        })
        .finally(() => {
          pending = null;
        });
    }
    await pending;
  }
  return cached.staff;
}

async function activeStaffEmails(): Promise<Set<string> | null> {
  return (await activeStaff())?.emails ?? null;
}

/**
 * Everyone's circle color, chosen in HR: { "<sign-in email>": "#rrggbb" }. Empty when HR
 * can't be asked, so circles fall back to their neutral look. Cached for a minute, like the
 * rest of this file. Serve it, signed-in only, at GET /api/team/avatar-colors as { colors }.
 */
export async function avatarColorsByEmail(): Promise<Record<string, string>> {
  return { ...((await activeStaff())?.colors ?? {}) };
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
