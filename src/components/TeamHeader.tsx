"use client";

import { useEffect, useId, useRef, useState, type ElementType, type KeyboardEvent, type ReactNode } from "react";
import type { AdminNavSection, UserNavLink } from "../nav-config";
import { moveMenuFocus, useDismiss } from "../ui/ActionMenu";
import { initialsFor } from "../ui/basics";
import { ChevronDownIcon, ChevronLeftIcon, CloseIcon, EyeIcon, MenuIcon, SignOutIcon } from "../ui/icons";
import { cx } from "../ui/styles";
import { AdminNavDropdown } from "./AdminNavDropdown";
import { UserNav } from "./UserNav";
import { useViewAs, type ViewAsOptions } from "./ViewAsDropdown";

export type TeamHeaderUser = {
  name?: string | null;
  email?: string | null;
  /** Shown after the email in the account menu, e.g. "Super admin". */
  roleLabel?: string | null;
};

type Variant = "tailwind" | "plain";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600";
const MENU_PANEL =
  "rounded-xl border border-stone-200 bg-white p-1.5 text-stone-900 shadow-[0_12px_32px_rgba(28,25,23,0.14)]";
const MENU_ITEM =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-stone-800 transition-colors hover:bg-stone-100 hover:text-stone-900 focus:bg-stone-100 focus:outline-none disabled:opacity-60";

const TAILWIND = {
  header: "z-40 border-b border-stone-200 bg-white",
  sticky: "sticky top-0",
  bar: "mx-auto flex h-16 w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6 lg:gap-6",
  logo: `flex shrink-0 items-center rounded-md transition-opacity hover:opacity-90 ${FOCUS}`,
  logoImg: "h-10 w-auto sm:h-11",
  nav: "hidden min-w-0 flex-1 items-center gap-1 lg:flex",
  spacer: "min-w-0 flex-1 lg:hidden",
  right: "flex shrink-0 items-center gap-2",
  admin: "hidden lg:block",
  menuButton: `grid h-11 w-11 place-items-center rounded-[10px] border border-stone-300 bg-white text-stone-900 transition-colors hover:bg-stone-50 lg:hidden ${FOCUS}`,
  mobile: "max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-stone-200 bg-white lg:hidden",
  mobileInner: "mx-auto flex w-full max-w-[1200px] flex-col gap-0.5 px-4 pb-4 pt-2 sm:px-6",
  mobileHeading: "px-3 pb-1 pt-4 text-[11.5px] font-bold uppercase tracking-[0.06em] text-stone-500",
  mobileItem: `flex items-center rounded-lg px-3 py-2.5 text-[15px] font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 ${FOCUS}`,
  mobileItemCurrent: "bg-stone-100 font-semibold text-stone-900",
  // Account menu
  account: "relative",
  accountTrigger: `flex h-11 items-center gap-2 rounded-full p-1.5 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-100 aria-expanded:bg-stone-100 lg:h-10 lg:bg-stone-100 lg:py-1 lg:pl-1 lg:pr-3 lg:hover:bg-stone-200 lg:aria-expanded:bg-stone-200 ${FOCUS}`,
  accountTriggerName: "hidden max-w-[9rem] truncate lg:inline",
  accountTriggerChevron: "hidden text-stone-500 lg:block",
  avatar: "inline-grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-900 text-xs font-semibold text-white",
  avatarLarge: "inline-grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-900 text-[13px] font-semibold text-white",
  accountMenu: `absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] ${MENU_PANEL}`,
  who: "flex items-center gap-2.5 px-2.5 py-2.5",
  whoText: "min-w-0",
  whoName: "truncate text-sm font-semibold text-stone-900",
  whoMeta: "truncate text-[12.5px] text-stone-500",
  separator: "mx-1 my-1 h-px bg-stone-100",
  item: MENU_ITEM,
  itemIcon: "shrink-0 text-stone-500",
  subHeader: "flex items-center gap-1 px-0.5 pb-1 pt-0.5",
  back: `grid h-8 w-8 place-items-center rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 ${FOCUS}`,
  subTitle: "text-sm font-semibold text-stone-900",
  search:
    "mx-1 mb-1.5 block h-9 w-[calc(100%-0.5rem)] rounded-lg border border-stone-300 px-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20",
  list: "max-h-[min(20rem,calc(100dvh-12rem))] overflow-y-auto",
  vaItem: `${MENU_ITEM} flex-col items-start gap-0`,
  vaItemCurrent: "bg-stone-100",
  vaName: "block w-full truncate font-medium",
  vaEmail: "block w-full truncate text-xs text-stone-500",
  status: "px-2.5 py-2 text-sm text-stone-500",
  error: "px-2.5 py-2 text-sm text-red-700",
};

/** Class names from styles/team-shell.css, for static pages without Tailwind. */
const PLAIN: typeof TAILWIND = {
  header: "team-header",
  sticky: "is-sticky",
  bar: "team-header-bar",
  logo: "team-header-logo",
  logoImg: "",
  nav: "team-header-nav",
  spacer: "team-header-spacer",
  right: "team-header-right",
  admin: "team-header-admin",
  menuButton: "team-header-menu-button",
  mobile: "team-header-mobile",
  mobileInner: "team-header-mobile-inner",
  mobileHeading: "team-header-mobile-heading",
  mobileItem: "team-header-mobile-item",
  mobileItemCurrent: "is-current",
  account: "team-account",
  accountTrigger: "team-account-trigger",
  accountTriggerName: "team-account-trigger-name",
  accountTriggerChevron: "team-account-trigger-chevron",
  avatar: "team-avatar",
  avatarLarge: "team-avatar is-large",
  accountMenu: "team-account-menu",
  who: "team-account-who",
  whoText: "team-account-who-text",
  whoName: "team-account-who-name",
  whoMeta: "team-account-who-meta",
  separator: "team-account-separator",
  item: "team-account-item",
  itemIcon: "team-account-item-icon",
  subHeader: "team-account-subheader",
  back: "team-account-back",
  subTitle: "team-account-subtitle",
  search: "team-view-as-search",
  list: "team-view-as-list",
  vaItem: "team-view-as-item",
  vaItemCurrent: "is-current",
  vaName: "team-view-as-item-name",
  vaEmail: "team-view-as-item-email",
  status: "team-view-as-status",
  error: "team-view-as-status is-error",
};

type Classes = typeof TAILWIND;

/** Show the people search once the list is longer than this. */
const SEARCH_THRESHOLD = 6;

const NO_VIEW_AS: ViewAsOptions = { realEmail: "", realName: "", currentEmail: "", isImpersonating: false };

function firstName(user: TeamHeaderUser | null | undefined): string {
  const name = String(user?.name || "").trim();
  if (name) return name.split(/\s+/)[0]!;
  return String(user?.email || "").split("@")[0] || "Account";
}

function AccountMenu({
  c,
  user,
  viewAs,
  onSignOut,
  signOutHref,
}: {
  c: Classes;
  user: TeamHeaderUser | null;
  viewAs: ViewAsOptions | null;
  onSignOut?: (() => void) | null;
  signOutHref?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "viewAs">("main");
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const plain = c === PLAIN;

  const close = (returnFocus: boolean) => {
    setOpen(false);
    setView("main");
    setQuery("");
    if (returnFocus) triggerRef.current?.focus();
  };
  useDismiss(open, rootRef, () => close(false));
  const va = useViewAs(viewAs ?? NO_VIEW_AS, Boolean(viewAs) && open && view === "viewAs", () => close(false));

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const menuEl = menuRef.current;
      if (!menuEl) return;
      if (view === "viewAs" && searchRef.current) searchRef.current.focus();
      else menuEl.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    });
  }, [open, view]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (view === "viewAs") {
        setView("main");
        setQuery("");
      } else {
        close(true);
      }
    } else if (e.key === "Tab") {
      close(false);
    } else if (e.target === searchRef.current) {
      // The search box keeps its own keys; Down moves into the list.
      if (e.key === "ArrowDown") {
        e.preventDefault();
        listRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
      }
    } else {
      moveMenuFocus(e, menuRef.current);
    }
  }

  const q = query.trim().toLowerCase();
  const people = q
    ? va.others.filter((u) => `${u.displayName} ${u.email}`.toLowerCase().includes(q))
    : va.others;
  const initials = initialsFor(user?.name, user?.email);

  return (
    <div ref={rootRef} className={c.account}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu${user?.name ? ` for ${user.name}` : ""}`}
        onClick={() => (open ? close(false) : setOpen(true))}
        className={c.accountTrigger}
      >
        <span aria-hidden className={c.avatar}>
          {initials}
        </span>
        <span aria-hidden className={c.accountTriggerName}>
          {firstName(user)}
        </span>
        <ChevronDownIcon size={14} className={c.accountTriggerChevron || undefined} />
      </button>
      {open ? (
        <div ref={menuRef} id={menuId} role="menu" aria-label="Account" onKeyDown={onKeyDown} className={c.accountMenu}>
          {view === "main" ? (
            <>
              {user && (user.name || user.email) ? (
                <>
                  <div className={c.who}>
                    <span aria-hidden className={c.avatarLarge}>
                      {initials}
                    </span>
                    <div className={c.whoText}>
                      <div className={c.whoName}>{user.name || user.email}</div>
                      {user.name && user.email ? <div className={c.whoMeta}>{user.email}</div> : null}
                      {user.roleLabel ? <div className={c.whoMeta}>{user.roleLabel}</div> : null}
                    </div>
                  </div>
                  <div role="separator" className={c.separator} />
                </>
              ) : null}
              {viewAs ? (
                <button type="button" role="menuitem" className={c.item} onClick={() => setView("viewAs")}>
                  <EyeIcon size={16} className={c.itemIcon} />
                  View as someone else…
                </button>
              ) : null}
              {signOutHref ? (
                <a role="menuitem" href={signOutHref} className={plain ? `${c.item} team-header-signout` : c.item}>
                  <SignOutIcon size={16} className={c.itemIcon} />
                  Sign out
                </a>
              ) : onSignOut ? (
                <button
                  type="button"
                  role="menuitem"
                  className={c.item}
                  onClick={() => {
                    close(false);
                    onSignOut();
                  }}
                >
                  <SignOutIcon size={16} className={c.itemIcon} />
                  Sign out
                </button>
              ) : null}
            </>
          ) : (
            <>
              <div className={c.subHeader}>
                <button
                  type="button"
                  role="menuitem"
                  aria-label="Back"
                  className={c.back}
                  onClick={() => {
                    setView("main");
                    setQuery("");
                  }}
                >
                  <ChevronLeftIcon size={16} />
                </button>
                <span className={c.subTitle}>View as…</span>
              </div>
              {va.others.length > SEARCH_THRESHOLD ? (
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people"
                  aria-label="Search people"
                  className={c.search}
                />
              ) : null}
              <div ref={listRef} className={c.list}>
                {va.isImpersonating ? (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={va.selfBusy}
                    onClick={va.exitViewAs}
                    className={c.vaItem}
                  >
                    <span className={c.vaName}>{va.selfBusy ? "Switching…" : `Yourself (${va.realName})`}</span>
                  </button>
                ) : null}
                {va.loading ? <div className={c.status}>Loading people…</div> : null}
                {va.error ? (
                  <div role="alert" className={c.error}>
                    {va.error}
                  </div>
                ) : null}
                {!va.loading
                  ? people.map((person) => {
                      const key = va.userKey(person);
                      const current = va.isCurrentUser(person);
                      return (
                        <button
                          key={key}
                          type="button"
                          role="menuitem"
                          disabled={Boolean(va.busyKey)}
                          aria-current={current ? "true" : undefined}
                          onClick={() => va.selectUser(person)}
                          className={cx(c.vaItem, current && c.vaItemCurrent)}
                        >
                          <span className={c.vaName}>{person.displayName}</span>
                          {person.email ? <span className={c.vaEmail}>{person.email}</span> : null}
                          {va.busyKey === key ? <span className={c.vaEmail}>Switching…</span> : null}
                        </button>
                      );
                    })
                  : null}
                {!va.loading && !va.error && people.length === 0 ? (
                  <div className={c.status}>{q ? "No one matches." : "No other people found."}</div>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The TEAM header, the same in every app: logo, the cross-app links, the app's Admin menu,
 * and an account menu (who you are, View as…, Sign out). Below 1024px the links and the
 * Admin menu fold into a menu button. It stays at the top of the window while you scroll.
 */
export function TeamHeader({
  variant = "tailwind",
  homeHref,
  logoSrc = "/team-logo.png",
  logoAlt = "Team Vocational Services",
  LinkComponent = "a",
  pathname,
  adminPathname,
  links,
  refreshKey,
  adminSections = [],
  user = null,
  viewAs = null,
  onSignOut,
  signOutHref,
  sticky = true,
  banner,
  children,
}: {
  variant?: Variant;
  /** Where the logo goes: the Dashboard (Updates "/" or its full URL from other apps). */
  homeHref: string;
  logoSrc?: string;
  logoAlt?: string;
  /** Next's Link for in-app links (default: a plain <a>). */
  LinkComponent?: ElementType;
  pathname: string;
  /** Path matched against the Admin menu items (default: pathname). */
  adminPathname?: string;
  /** The cross-app links. Leave out (or null) to hide them, e.g. when signed out. */
  links?: UserNavLink[] | null;
  /** Change when the signed-in or viewed-as person changes, to refetch the Payroll badge. */
  refreshKey?: string;
  /** The app's Admin menu; empty hides it. */
  adminSections?: AdminNavSection[];
  user?: TeamHeaderUser | null;
  /** View as… settings; null hides it (non-admins). */
  viewAs?: ViewAsOptions | null;
  onSignOut?: (() => void) | null;
  /** A sign-out link instead of onSignOut (Payroll's /logout). */
  signOutHref?: string | null;
  sticky?: boolean;
  /** Shown above the header, e.g. the view-as banner. */
  banner?: ReactNode;
  /** Shown inside the header, under the bar, e.g. Updates' announcement ticker. */
  children?: ReactNode;
}) {
  const c = variant === "plain" ? PLAIN : TAILWIND;
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileId = useId();
  const adminPath = adminPathname ?? pathname;
  const hasAdmin = adminSections.length > 0;
  const hasAccount = Boolean(user || onSignOut || signOutHref);
  const hasMobileMenu = Boolean(links?.length) || hasAdmin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Link = LinkComponent as any;
  const HomeLink = /^https?:\/\//.test(homeHref) ? "a" : Link;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape" && !e.defaultPrevented) setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {banner}
      <header className={cx(c.header, sticky && c.sticky)}>
        <div className={c.bar}>
          <HomeLink href={homeHref} className={c.logo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt={logoAlt} width={460} height={190} className={c.logoImg || undefined} />
          </HomeLink>
          {links?.length ? (
            <nav aria-label="TEAM apps" className={c.nav}>
              <UserNav
                variant={variant}
                links={links}
                pathname={pathname}
                LinkComponent={LinkComponent}
                refreshKey={refreshKey}
              />
            </nav>
          ) : null}
          <div className={c.spacer} />
          <div className={c.right}>
            {hasAdmin ? (
              <div className={c.admin}>
                <AdminNavDropdown
                  variant={variant}
                  sections={adminSections}
                  pathname={adminPath}
                  LinkComponent={LinkComponent}
                  align="right"
                />
              </div>
            ) : null}
            {hasAccount ? (
              <AccountMenu c={c} user={user} viewAs={viewAs} onSignOut={onSignOut} signOutHref={signOutHref} />
            ) : null}
            {hasMobileMenu ? (
              <button
                type="button"
                className={c.menuButton}
                aria-expanded={mobileOpen}
                aria-controls={mobileId}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
              </button>
            ) : null}
          </div>
        </div>
        {hasMobileMenu && mobileOpen ? (
          <div id={mobileId} className={c.mobile}>
            <nav aria-label="Menu" className={c.mobileInner}>
              {links?.length ? (
                <UserNav
                  variant={variant}
                  layout="stack"
                  links={links}
                  pathname={pathname}
                  LinkComponent={LinkComponent}
                  refreshKey={refreshKey}
                  onNavigate={closeMobile}
                />
              ) : null}
              {adminSections.map((section) => (
                <div key={section.label} role="group" aria-label={`Admin: ${section.label}`}>
                  <div className={c.mobileHeading}>Admin · {section.label}</div>
                  {section.items.map((item) => {
                    const current = item.isActive?.(adminPath) ?? false;
                    const ItemLink = item.external ? "a" : Link;
                    return (
                      <ItemLink
                        key={`${item.href}-${item.label}`}
                        href={item.href}
                        aria-current={current ? "page" : undefined}
                        onClick={closeMobile}
                        className={cx(c.mobileItem, current && c.mobileItemCurrent)}
                      >
                        {item.label}
                      </ItemLink>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        ) : null}
        {children}
      </header>
    </>
  );
}
