"use client";

/**
 * Client-side helpers for admin "view as" (impersonation).
 * Each app exposes GET/POST/DELETE at `apiPath` (default /api/impersonate).
 *
 * By default a successful switch reloads the page. Pass `{ reload: false }` to stay on the
 * page and handle the change yourself (the static Payroll pages re-render in place).
 */
export type ImpersonationRequestOptions = { reload?: boolean };

async function postImpersonation(
  body: { email: string } | { employeeId: string | number },
  apiPath: string,
  options?: ImpersonationRequestOptions
): Promise<string | null> {
  const res = await fetch(apiPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return (data as { error?: string }).error || "Could not switch user";
  }
  if (options?.reload !== false) window.location.reload();
  return null;
}

export async function startImpersonation(
  email: string,
  apiPath = "/api/impersonate",
  options?: ImpersonationRequestOptions
): Promise<string | null> {
  return postImpersonation({ email }, apiPath, options);
}

export async function startImpersonationByEmployeeId(
  employeeId: string | number,
  apiPath = "/api/impersonate",
  options?: ImpersonationRequestOptions
): Promise<string | null> {
  return postImpersonation({ employeeId }, apiPath, options);
}

/**
 * Ends view-as. With the default reload the page reloads whatever the response (as before);
 * with `{ reload: false }` it resolves to an error message, or null on success.
 */
export async function stopImpersonation(
  apiPath = "/api/impersonate",
  options?: ImpersonationRequestOptions
): Promise<string | null> {
  const res = await fetch(apiPath, { method: "DELETE" });
  if (options?.reload !== false) {
    window.location.reload();
    return null;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return (data as { error?: string }).error || "Could not exit view-as";
  }
  return null;
}

export async function fetchImpersonationStatus(
  apiPath = "/api/impersonate"
): Promise<import("./impersonation/constants").ImpersonationStatus | null> {
  const res = await fetch(apiPath, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}
