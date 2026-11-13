/**
 * Shared by the emergency code form (browser), the apps' /api/emergency-sign-in and HR.
 *
 * HR decides what a TEAM address is (its ALLOWED_DOMAIN), since it sends the codes: asked
 * for a code for an address outside it, HR answers status EMERGENCY_NOT_TEAM_ADDRESS
 * instead of quietly sending nothing. Each app passes that on as 400 { error:
 * EMERGENCY_NOT_TEAM_ADDRESS } (emergencyCodeReply), and the form says to use the TEAM
 * address. People often type their personal one, since that's where the code goes. The
 * answer only reflects the domain rule, never whether someone works here.
 */
export const EMERGENCY_NOT_TEAM_ADDRESS = "not_team_address";

/** The 400 body for an address outside HR's TEAM domains. */
export function notTeamAddressBody(): { error: typeof EMERGENCY_NOT_TEAM_ADDRESS } {
  return { error: EMERGENCY_NOT_TEAM_ADDRESS };
}

/**
 * What an app's POST /api/emergency-sign-in answers for HR's send status: 503 when it's
 * off, 400 notTeamAddressBody() for a non-TEAM address, otherwise { ok: true } whether or
 * not a code went out (so the endpoint can't be used to find out who works here).
 */
export function emergencyCodeReply(status: string): { status: number; body: Record<string, unknown> } {
  if (status === "off") return { status: 503, body: { error: "Emergency sign-in is off." } };
  if (status === EMERGENCY_NOT_TEAM_ADDRESS) return { status: 400, body: notTeamAddressBody() };
  return { status: 200, body: { ok: true } };
}
