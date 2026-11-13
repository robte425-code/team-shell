import { INTERNAL_FETCH_TIMEOUT_MS, internalAppOrigin } from "./internal-urls";

/**
 * Server only. One sign-in for all TEAM apps.
 *
 * Signing in: every sign-in page goes straight through Microsoft (see useTeamAutoSignIn in
 * @team/shell/ui), so being signed in to Microsoft signs you in to whichever app you open.
 *
 * Signing out: of any app signs you out of all of them, and out of Microsoft in that browser.
 * HR keeps, per work email, when the person last signed out (/api/internal/sign-out with
 * TEAM_INTERNAL_ACCESS_SECRET); each app's jwt callback calls teamSessionSignedOut and ends
 * sessions that started before then. Each app's /api/sign-out calls recordTeamSignOutRemote
 * and sends the browser to microsoftSignOutUrl.
 */

function hrEndpoint(env: NodeJS.ProcessEnv): { url: string; secret: string } | null {
  const secret = env.TEAM_INTERNAL_ACCESS_SECRET?.trim();
  const hr = internalAppOrigin("hr", env);
  if (!secret || !hr) return null;
  return { url: `${hr}/api/internal/sign-out`, secret };
}

async function askHr<T>(body: Record<string, unknown>, env: NodeJS.ProcessEnv): Promise<T | null> {
  const hr = hrEndpoint(env);
  if (!hr) return null;
  try {
    const res = await fetch(hr.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${hr.secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(INTERNAL_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function normalize(email: unknown): string {
  return String(email ?? "").trim().toLowerCase();
}

const CACHE_MS = 30 * 1000;
const cache = new Map<string, { at: number; value: number | null }>();

/** Record with HR that this person signed out (of every app). Never throws; false if HR couldn't be told. */
export async function recordTeamSignOutRemote(email: unknown, env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const e = normalize(email);
  if (!e.includes("@")) return false;
  cache.delete(e);
  const r = await askHr<{ ok?: boolean }>({ action: "record", email: e }, env);
  return r?.ok === true;
}

/**
 * For the NextAuth jwt callback (pass its token and account). Stamps when the session signed
 * in, and says whether the person has signed out of any TEAM app since, so this session should
 * end. Asks HR at most every 30 seconds per person; if HR can't be asked, the session stays.
 */
export async function teamSessionSignedOut(
  token: Record<string, unknown>,
  account: unknown,
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  if (account || typeof token.signedInAt !== "number") token.signedInAt = Date.now();
  const e = normalize(token.email);
  if (!e.includes("@")) return false;
  let entry = cache.get(e);
  if (!entry || Date.now() - entry.at > CACHE_MS) {
    const r = await askHr<{ signedOutAt?: number | null }>({ action: "get", email: e }, env);
    if (!r) return false;
    entry = { at: Date.now(), value: typeof r.signedOutAt === "number" ? r.signedOutAt : null };
    cache.set(e, entry);
  }
  return entry.value !== null && entry.value > (token.signedInAt as number);
}

/**
 * Microsoft's sign-out page for TEAM's directory, coming back to `returnTo` (which must be
 * registered as a redirect URI on the app registration, or Microsoft shows its own
 * "You signed out" page instead). Null without a tenant id.
 */
export function microsoftSignOutUrl(returnTo: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const tenant = env.AZURE_AD_TENANT_ID?.trim();
  if (!tenant || ["common", "organizations", "consumers"].includes(tenant.toLowerCase())) return null;
  return `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(returnTo)}`;
}

/** Where to land after signing out: this app's sign-in page, saying so. */
export function signedOutLandingUrl(env: NodeJS.ProcessEnv = process.env, path = "/login"): string {
  const base = (env.NEXTAUTH_URL || "").replace(/\/$/, "");
  return `${base}${path}?signedOut=1`;
}
