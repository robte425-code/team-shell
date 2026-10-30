"use client";

import { useEffect, useRef, useState } from "react";
import {
  startImpersonation,
  startImpersonationByEmployeeId,
  stopImpersonation,
} from "../impersonate-client";
import type { ViewAsUser } from "../impersonation/constants";

function Chevron({ open, plain }: { open: boolean; plain?: boolean }) {
  return (
    <svg
      className={
        plain ? undefined : `h-4 w-4 shrink-0 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`
      }
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

const TAILWIND = {
  root: "relative shrink-0",
  trigger:
    "flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm transition-colors hover:bg-stone-50",
  menu: "top-full z-30 mt-1 w-72 rounded-lg border border-stone-200 bg-white py-1 shadow-lg",
  heading: "sticky top-0 z-[1] border-b border-stone-100 bg-white px-3 py-2",
  headingText: "text-xs font-semibold uppercase tracking-wide text-stone-500",
  self: "block w-full px-3 py-2 text-left text-sm font-medium text-stone-900 hover:bg-stone-50 disabled:opacity-60",
  status: "px-3 py-2 text-sm text-stone-500",
  error: "px-3 py-2 text-sm text-red-600",
  item: "block w-full px-3 py-2 text-left text-sm",
  itemCurrent: "bg-stone-100 font-medium text-stone-900",
  itemIdle: "text-stone-600 hover:bg-stone-50 hover:text-stone-900",
  itemDisabled: "disabled:opacity-60",
  name: "block truncate",
  email: "block truncate text-xs text-stone-400",
  busy: "text-xs text-stone-500",
};

/** Class names from styles/team-shell.css, for static pages without Tailwind. */
const PLAIN: typeof TAILWIND = {
  root: "team-view-as",
  trigger: "team-view-as-trigger",
  menu: "team-view-as-menu",
  heading: "team-view-as-menu-heading",
  headingText: "",
  self: "team-view-as-item",
  status: "team-view-as-status",
  error: "team-view-as-status is-error",
  item: "team-view-as-item",
  itemCurrent: "is-current",
  itemIdle: "",
  itemDisabled: "",
  name: "team-view-as-item-name",
  email: "team-view-as-item-email",
  busy: "team-view-as-item-email",
};

export type ViewAsChange = { type: "start"; user: ViewAsUser } | { type: "stop" };

async function defaultLoadUsers(usersApiPath: string): Promise<ViewAsUser[]> {
  const r = await fetch(usersApiPath);
  const data = (await r.json().catch(() => ({}))) as { users?: ViewAsUser[]; error?: string };
  if (!r.ok) throw new Error(data.error || "Could not load users");
  return Array.isArray(data.users) ? data.users : [];
}

const SELF_KEY = "__self__";

export function ViewAsDropdown({
  realEmail,
  realName,
  currentEmail,
  isImpersonating,
  usersApiPath = "/api/view-as-users",
  impersonateApiPath = "/api/impersonate",
  menuAlign = "right",
  variant = "tailwind",
  identifyBy = "email",
  realUserId,
  currentUserId,
  loadUsers,
  onChange,
}: {
  realEmail: string;
  realName: string;
  currentEmail: string;
  isImpersonating: boolean;
  usersApiPath?: string;
  impersonateApiPath?: string;
  menuAlign?: "left" | "right";
  /** "tailwind" (default) or "plain" (styles/team-shell.css class names). */
  variant?: "tailwind" | "plain";
  /** "employeeId" posts `{ employeeId: user.id }` instead of `{ email }` (Payroll). */
  identifyBy?: "email" | "employeeId";
  /** With identifyBy="employeeId": the signed-in admin's own id, left out of the list. */
  realUserId?: string | null;
  /** With identifyBy="employeeId": the id currently viewed as, highlighted in the list. */
  currentUserId?: string | null;
  /** Replaces the default `GET usersApiPath` → `{ users }` loader. Throw to show an error. */
  loadUsers?: () => Promise<ViewAsUser[]>;
  /**
   * Called after a successful switch or exit instead of reloading the page.
   * Leave unset to keep the default (reload).
   */
  onChange?: (change: ViewAsChange) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<ViewAsUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const plain = variant === "plain";
  const c = plain ? PLAIN : TAILWIND;
  const byId = identifyBy === "employeeId";
  const userKey = (u: ViewAsUser) => (byId && u.id != null ? String(u.id) : u.email);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open || users.length > 0) return;
    let active = true;
    setLoading(true);
    setError(null);
    (loadUsers ? loadUsers() : defaultLoadUsers(usersApiPath))
      .then((list) => {
        if (active) setUsers(list);
      })
      .catch((e: Error) => {
        if (active) setError(e?.message || "Could not load users");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // loadUsers is read when the menu opens; a new function identity alone shouldn't refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, users.length, usersApiPath]);

  async function afterSuccess(change: ViewAsChange) {
    if (!onChange) return; // the helper already reloaded the page
    setOpen(false);
    setBusyKey(null);
    await onChange(change);
  }

  async function selectUser(user: ViewAsUser) {
    setBusyKey(userKey(user));
    setError(null);
    const options = { reload: !onChange };
    let err: string | null;
    try {
      err =
        byId && user.id != null
          ? await startImpersonationByEmployeeId(user.id, impersonateApiPath, options)
          : await startImpersonation(user.email, impersonateApiPath, options);
    } catch {
      err = "Could not switch user";
    }
    if (err) {
      setError(err);
      setBusyKey(null);
      return;
    }
    await afterSuccess({ type: "start", user });
  }

  async function exitViewAs() {
    setBusyKey(SELF_KEY);
    setError(null);
    let err: string | null;
    try {
      err = await stopImpersonation(impersonateApiPath, { reload: !onChange });
    } catch {
      err = "Could not exit view-as";
    }
    if (err) {
      setError(err);
      setBusyKey(null);
      return;
    }
    await afterSuccess({ type: "stop" });
  }

  const realEmailLower = realEmail.toLowerCase();
  const isSelf = (u: ViewAsUser) =>
    byId && realUserId != null && u.id != null
      ? String(u.id) === String(realUserId)
      : u.email.toLowerCase() === realEmailLower;
  const isCurrentUser = (u: ViewAsUser) =>
    byId && currentUserId != null && u.id != null
      ? String(u.id) === String(currentUserId)
      : u.email.toLowerCase() === currentEmail.toLowerCase();
  const others = users.filter((u) => !isSelf(u));
  const alignClass = plain ? "" : menuAlign === "right" ? "right-0 sm:left-auto sm:right-0" : "left-0";

  return (
    <div className={c.root} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={c.trigger}
      >
        <span>View as…</span>
        <Chevron open={open} plain={plain} />
      </button>
      {open && (
        <ul
          role="menu"
          aria-label="View as"
          className={plain ? c.menu : `absolute ${alignClass} ${c.menu}`}
          style={
            plain
              ? undefined
              : {
                  maxHeight: "min(20rem, calc(100dvh - 5rem))",
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                }
          }
        >
          <li role="presentation" className={c.heading}>
            <span className={c.headingText || undefined}>View as…</span>
          </li>
          {isImpersonating && (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                disabled={busyKey === SELF_KEY}
                onClick={exitViewAs}
                className={c.self}
              >
                {busyKey === SELF_KEY ? "Switching…" : `Yourself (${realName})`}
              </button>
            </li>
          )}
          {loading && <li className={c.status}>Loading users…</li>}
          {error && <li className={c.error}>{error}</li>}
          {!loading &&
            others.map((user) => {
              const key = userKey(user);
              const isCurrent = isImpersonating && isCurrentUser(user);
              const busy = busyKey === key;
              const stateClass = isCurrent ? c.itemCurrent : c.itemIdle;
              return (
                <li key={key} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={Boolean(busyKey)}
                    onClick={() => selectUser(user)}
                    className={[c.item, stateClass, c.itemDisabled].filter(Boolean).join(" ")}
                  >
                    <span className={c.name}>{user.displayName}</span>
                    {(user.email || !plain) && <span className={c.email}>{user.email}</span>}
                    {busy && <span className={c.busy}>Switching…</span>}
                  </button>
                </li>
              );
            })}
          {!loading && !error && others.length === 0 && (
            <li className={c.status}>No other users found.</li>
          )}
        </ul>
      )}
    </div>
  );
}

/** Inline shortcut button for contextual "View as this user" actions. */
export function ViewAsUserButton({
  email,
  label = "View as this user",
  impersonateApiPath = "/api/impersonate",
  className = "text-sm font-medium text-stone-600 hover:text-stone-900 underline-offset-2 hover:underline",
}: {
  email: string;
  label?: string;
  impersonateApiPath?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className={className}
      onClick={async () => {
        setBusy(true);
        await startImpersonation(email, impersonateApiPath);
      }}
    >
      {busy ? "Switching…" : label}
    </button>
  );
}
