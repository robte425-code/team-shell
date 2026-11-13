/**
 * Shared by the emergency code form (browser) and the apps' /api/emergency-sign-in
 * (server). When someone asks for a code with an address outside the app's
 * ALLOWED_DOMAIN, the app answers 400 { error: EMERGENCY_NOT_TEAM_ADDRESS } instead of
 * asking HR, and the form says to use the TEAM address. People often type their
 * personal one, since that's where the code goes; HR would quietly send nothing. The
 * answer only reflects the domain rule, never whether someone works here.
 */
export const EMERGENCY_NOT_TEAM_ADDRESS = "not_team_address";

/** The 400 body for an address outside ALLOWED_DOMAIN. */
export function notTeamAddressBody(): { error: typeof EMERGENCY_NOT_TEAM_ADDRESS } {
  return { error: EMERGENCY_NOT_TEAM_ADDRESS };
}
