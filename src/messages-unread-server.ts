import { INTERNAL_FETCH_TIMEOUT_MS, internalAppOrigin } from "./internal-urls";

export type MessagesUnreadStatus = { unread: number };

const NONE: MessagesUnreadStatus = { unread: 0 };

/**
 * Server only. How many unread messages this sign-in email has in TEAM Messages, for the
 * Messages badge in the top menu. Each app serves it to its own pages at
 * MESSAGES_UNREAD_API_PATH (/api/messages-unread):
 *
 *   export async function GET() {
 *     const user = await getCurrentUser();
 *     if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *     return NextResponse.json(await fetchMessagesUnreadForEmail(user.email));
 *   }
 *
 * Asks Messages' GET /api/internal/unread with TEAM_INTERNAL_ACCESS_SECRET. Never throws;
 * { unread: 0 } when Messages can't be asked.
 */
export async function fetchMessagesUnreadForEmail(
  email: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<MessagesUnreadStatus> {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized.includes("@")) return NONE;
  const secret = env.TEAM_INTERNAL_ACCESS_SECRET?.trim();
  if (!secret) return NONE;
  const base = internalAppOrigin("messages", env);
  if (!base) return NONE;
  try {
    const res = await fetch(`${base}/api/internal/unread?email=${encodeURIComponent(normalized)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(INTERNAL_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return NONE;
    const data = (await res.json()) as { unread?: unknown };
    const unread = Number(data.unread);
    return { unread: Number.isFinite(unread) && unread > 0 ? Math.floor(unread) : 0 };
  } catch {
    return NONE;
  }
}
