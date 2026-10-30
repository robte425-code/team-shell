import { INTERNAL_FETCH_TIMEOUT_MS, internalAppOrigin } from "./internal-urls";

/** Live super-admin check against Updates (AppSuperAdmin table). */
export async function isSuperAdminEmailRemote(
  email: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  const secret = env.TEAM_INTERNAL_ACCESS_SECRET?.trim();
  if (!secret) return false;
  const updatesBase = internalAppOrigin("updates", env);
  if (!updatesBase) return false;
  try {
    const url = `${updatesBase}/api/internal/is-super-admin?email=${encodeURIComponent(normalized)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(INTERNAL_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { superAdmin?: boolean };
    return data.superAdmin === true;
  } catch {
    return false;
  }
}
