"use client";

import { useEffect, useState } from "react";
import type { ElementType } from "react";
import type { UserNavLink } from "../nav-config";
import { PAYROLL_NAV_KEY, PAYROLL_UNREAD_API_PATH } from "../nav-config";

const LINK_CLASS = {
  bar:
    "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
  stack:
    "flex items-center rounded-lg px-3 py-2.5 text-[15px] font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
};
const ACTIVE_CLASS = "bg-stone-100 font-semibold text-stone-900";

const unreadPayrollClass =
  "bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-300 after:ml-1.5 after:inline-block after:h-2 after:w-2 after:rounded-full after:bg-emerald-600 after:align-middle";

function usePayrollUnread(refreshKey?: string) {
  const [hasUnread, setHasUnread] = useState(false);
  const [title, setTitle] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    fetch(PAYROLL_UNREAD_API_PATH, { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const unread = Boolean(data.hasUnreadPayStub);
        setHasUnread(unread);
        setTitle(
          unread && data.checkDate
            ? `New pay stub for ${String(data.checkDate).slice(0, 10)}`
            : unread
              ? "New pay stub available"
              : undefined
        );
      })
      .catch(() => {
        if (!cancelled) {
          setHasUnread(false);
          setTitle(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { hasUnread, title };
}

export function UserNav({
  links,
  pathname,
  LinkComponent,
  refreshKey,
  variant = "tailwind",
  layout = "bar",
  onNavigate,
}: {
  links: UserNavLink[];
  pathname: string;
  LinkComponent: ElementType<any>;
  /** Change when impersonation or session identity changes to refetch unread state. */
  refreshKey?: string;
  /**
   * "tailwind" (default): Tailwind utility classes, for the Next.js apps.
   * "plain": the class names in styles/team-shell.css (`.team-header-nav a`,
   * `aria-current="page"`, `.has-unread-paystub`), for static pages without Tailwind.
   */
  variant?: "tailwind" | "plain";
  /** "bar" (default): a row of pills. "stack": full-width rows, for the phone menu. */
  layout?: "bar" | "stack";
  /** Called when a link is followed (closes the phone menu). */
  onNavigate?: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Link = LinkComponent as any;
  const payrollUnread = usePayrollUnread(refreshKey);
  const plain = variant === "plain";
  const linkClass = LINK_CLASS[layout];

  return (
    <>
      {links.map((item) => {
        const isPayroll = item.navKey === PAYROLL_NAV_KEY;
        const unread = isPayroll && payrollUnread.hasUnread;
        const unreadClass = unread ? (plain ? "has-unread-paystub" : unreadPayrollClass) : "";
        const unreadTitle = unread ? payrollUnread.title : undefined;

        if (item.kind === "internal") {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={
                plain
                  ? unreadClass || undefined
                  : `${linkClass} ${active ? ACTIVE_CLASS : ""} ${unreadClass}`
              }
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              data-nav-key={plain ? item.navKey : undefined}
              title={unreadTitle}
            >
              {item.label}
            </Link>
          );
        }
        return (
          <a
            key={item.href + item.label}
            href={item.href}
            target={item.openInNewTab ? "_blank" : undefined}
            rel={item.openInNewTab ? "noopener noreferrer" : undefined}
            className={plain ? unreadClass || undefined : `${linkClass} ${unreadClass}`}
            data-nav-key={plain ? item.navKey : undefined}
            title={unreadTitle}
            onClick={onNavigate}
          >
            {item.label}
          </a>
        );
      })}
    </>
  );
}
