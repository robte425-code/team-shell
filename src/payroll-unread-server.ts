import { INTERNAL_FETCH_TIMEOUT_MS, internalAppOrigin } from "./internal-urls";

export type PayrollUnreadStatus = {
  hasUnreadPayStub: boolean;
  latestStubId: string | null;
  checkDate: string | null;
};

const EMPTY: PayrollUnreadStatus = {
  hasUnreadPayStub: false,
  latestStubId: null,
  checkDate: null,
};

/** Server-side: ask Payroll whether this sign-in email has an undownloaded latest stub. */
export async function fetchPayrollUnreadForEmail(
  email: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<PayrollUnreadStatus> {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized.includes("@")) return EMPTY;

  const secret = env.TEAM_INTERNAL_ACCESS_SECRET?.trim();
  if (!secret) return EMPTY;

  const payrollBase = internalAppOrigin("payroll", env);
  if (!payrollBase) return EMPTY;
  const url = `${payrollBase}/api/internal/pay-stub-unread?email=${encodeURIComponent(normalized)}`;

  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(INTERNAL_FETCH_TIMEOUT_MS),
    });
    if (!r.ok) return EMPTY;
    const data = (await r.json()) as PayrollUnreadStatus;
    return {
      hasUnreadPayStub: Boolean(data.hasUnreadPayStub),
      latestStubId: data.latestStubId ?? null,
      checkDate: data.checkDate ?? null,
    };
  } catch {
    return EMPTY;
  }
}
