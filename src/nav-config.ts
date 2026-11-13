export const DEFAULT_UPDATES_URL = "https://teamvoc-updates.vercel.app";
export const DEFAULT_REQUESTS_URL = "https://team-requests.vercel.app";
export const DEFAULT_VOC_HOTLINE_URL = "https://voc-hotline-nine.vercel.app";
export const DEFAULT_HR_URL = "https://team-hr.vercel.app";
export const DEFAULT_PAYROLL_URL = "https://team-payroll.vercel.app/my-leave.html";
export const DEFAULT_MESSAGES_URL = "https://team-messages.vercel.app";

export const PAYROLL_NAV_KEY = "payroll";
export const PAYROLL_UNREAD_API_PATH = "/api/payroll-unread";

export const MESSAGES_NAV_KEY = "messages";
/** Each app answers this with { unread } for the signed-in person (see messages-unread-server). */
export const MESSAGES_UNREAD_API_PATH = "/api/messages-unread";

export type UserNavLink =
  | {
      kind: "internal";
      href: string;
      label: string;
      isActive: (path: string) => boolean;
      navKey?: string;
    }
  | { kind: "external"; href: string; label: string; openInNewTab?: boolean; navKey?: string };

export type AdminNavItem = {
  href: string;
  label: string;
  isActive?: (path: string) => boolean;
  external?: boolean;
  separatorBefore?: boolean;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

export function teamUrls(env: NodeJS.ProcessEnv = process.env) {
  return {
    updates: env.NEXT_PUBLIC_UPDATES_URL || DEFAULT_UPDATES_URL,
    requests: env.NEXT_PUBLIC_REQUESTS_URL || DEFAULT_REQUESTS_URL,
    vocHotline: env.NEXT_PUBLIC_VOC_HOTLINE_URL || DEFAULT_VOC_HOTLINE_URL,
    hr: env.NEXT_PUBLIC_HR_URL || DEFAULT_HR_URL,
    payroll: env.NEXT_PUBLIC_PAYROLL_URL || DEFAULT_PAYROLL_URL,
    messages: env.NEXT_PUBLIC_MESSAGES_URL || DEFAULT_MESSAGES_URL,
  };
}

export const PLATFORM_HUB_SECTION_LABEL = "All TEAM apps";

/** Access hub + Backup hub — their own "All TEAM apps" section when includePlatformHub (super admin). */
export function platformHubAdminItems(
  env?: NodeJS.ProcessEnv,
  onUpdatesApp = false
): AdminNavItem[] {
  const updatesBase = teamUrls(env).updates.replace(/\/$/, "");
  if (onUpdatesApp) {
    return [
      {
        href: "/manage/access",
        label: "Access hub",
        isActive: (p) => p.startsWith("/manage/access"),
      },
      {
        href: "/manage/backup",
        label: "Backup hub",
        isActive: (p) => p.startsWith("/manage/backup"),
      },
    ];
  }
  return [
    {
      href: `${updatesBase}/manage/access`,
      label: "Access hub",
      external: true,
    },
    {
      href: `${updatesBase}/manage/backup`,
      label: "Backup hub",
      external: true,
    },
  ];
}

/**
 * An app's Admin menu: its own section (when the person is an admin of the app), then
 * "All TEAM apps" with the Access and Backup hubs (super admins, not while viewing as someone).
 */
function adminMenu(
  appLabel: string,
  appItems: AdminNavItem[],
  options: { includePlatformHub?: boolean; includeAppAdmin?: boolean } | undefined,
  env?: NodeJS.ProcessEnv,
  onUpdatesApp = false
): AdminNavSection[] {
  const sections: AdminNavSection[] = [];
  if (options?.includeAppAdmin !== false && appItems.length > 0) {
    sections.push({ label: appLabel, items: appItems });
  }
  if (options?.includePlatformHub) {
    sections.push({ label: PLATFORM_HUB_SECTION_LABEL, items: platformHubAdminItems(env, onUpdatesApp) });
  }
  return sections;
}

/** First nav item — TEAM Updates home. Internal on the Updates app, external elsewhere. */
export function dashboardNavLink(
  env?: NodeJS.ProcessEnv,
  onUpdatesApp = false
): UserNavLink {
  const urls = teamUrls(env);
  if (onUpdatesApp) {
    return {
      kind: "internal",
      href: "/",
      label: "Dashboard",
      isActive: (p) => p === "/",
    };
  }
  return {
    kind: "external",
    href: urls.updates,
    label: "Dashboard",
  };
}

/** The Messages link, external everywhere but the Messages app. */
function messagesNavLink(env?: NodeJS.ProcessEnv): UserNavLink {
  return { kind: "external", href: teamUrls(env).messages, label: "Messages", navKey: MESSAGES_NAV_KEY };
}

/** Canonical user nav order: Dashboard → Requests → Phone book → Voc hotline → Payroll → HR → Messages */
export function updatesUserNav(pathname: string, env?: NodeJS.ProcessEnv): UserNavLink[] {
  const urls = teamUrls(env);
  return [
    dashboardNavLink(env, true),
    { kind: "external", href: urls.requests, label: "Requests" },
    {
      kind: "internal",
      href: "/phone-book",
      label: "Phone book",
      isActive: (p) => p.startsWith("/phone-book"),
    },
    { kind: "external", href: urls.vocHotline, label: "Voc hotline" },
    { kind: "external", href: urls.payroll, label: "Payroll", navKey: PAYROLL_NAV_KEY },
    { kind: "external", href: urls.hr, label: "HR" },
    messagesNavLink(env),
  ];
}

export function requestsUserNav(isAgent: boolean, pathname: string, env?: NodeJS.ProcessEnv): UserNavLink[] {
  const urls = teamUrls(env);
  return [
    dashboardNavLink(env, false),
    {
      kind: "internal",
      href: isAgent ? "/dashboard" : "/my-tickets",
      label: "Requests",
      isActive: (p) =>
        p === "/dashboard" ||
        p.startsWith("/dashboard/") ||
        p === "/my-tickets" ||
        p.startsWith("/my-tickets/") ||
        p.startsWith("/tickets") ||
        p.startsWith("/admin"),
    },
    { kind: "external", href: `${urls.updates}/phone-book`, label: "Phone book" },
    { kind: "external", href: urls.vocHotline, label: "Voc hotline" },
    { kind: "external", href: urls.payroll, label: "Payroll", navKey: PAYROLL_NAV_KEY },
    { kind: "external", href: urls.hr, label: "HR" },
    messagesNavLink(env),
  ];
}

export function hrUserNav(pathname: string, env?: NodeJS.ProcessEnv): UserNavLink[] {
  const urls = teamUrls(env);
  return [
    dashboardNavLink(env, false),
    { kind: "external", href: urls.requests, label: "Requests" },
    { kind: "external", href: `${urls.updates.replace(/\/$/, "")}/phone-book`, label: "Phone book" },
    { kind: "external", href: urls.vocHotline, label: "Voc hotline" },
    { kind: "external", href: urls.payroll, label: "Payroll", navKey: PAYROLL_NAV_KEY },
    {
      kind: "internal",
      href: "/",
      label: "HR",
      isActive: () => true,
    },
    messagesNavLink(env),
  ];
}

export function vocHotlineUserNav(pathname: string, env?: NodeJS.ProcessEnv): UserNavLink[] {
  const urls = teamUrls(env);
  return [
    dashboardNavLink(env, false),
    { kind: "external", href: urls.requests, label: "Requests" },
    { kind: "external", href: `${urls.updates}/phone-book`, label: "Phone book" },
    {
      kind: "internal",
      href: "/",
      label: "Voc hotline",
      isActive: (p) => p === "/" || p.startsWith("/chat"),
    },
    { kind: "external", href: urls.payroll, label: "Payroll", navKey: PAYROLL_NAV_KEY },
    { kind: "external", href: urls.hr, label: "HR" },
    messagesNavLink(env),
  ];
}

/** Payroll's own pages are static HTML; its home is My time off. */
export function payrollUserNav(pathname: string, env?: NodeJS.ProcessEnv): UserNavLink[] {
  const urls = teamUrls(env);
  return [
    dashboardNavLink(env, false),
    { kind: "external", href: urls.requests, label: "Requests" },
    { kind: "external", href: `${urls.updates.replace(/\/$/, "")}/phone-book`, label: "Phone book" },
    { kind: "external", href: urls.vocHotline, label: "Voc hotline" },
    {
      kind: "internal",
      href: "/my-leave.html",
      label: "Payroll",
      isActive: () => true,
      navKey: PAYROLL_NAV_KEY,
    },
    { kind: "external", href: urls.hr, label: "HR" },
    messagesNavLink(env),
  ];
}

/** The Messages app: its own link is internal. */
export function messagesUserNav(pathname: string, env?: NodeJS.ProcessEnv): UserNavLink[] {
  const urls = teamUrls(env);
  return [
    dashboardNavLink(env, false),
    { kind: "external", href: urls.requests, label: "Requests" },
    { kind: "external", href: `${urls.updates.replace(/\/$/, "")}/phone-book`, label: "Phone book" },
    { kind: "external", href: urls.vocHotline, label: "Voc hotline" },
    { kind: "external", href: urls.payroll, label: "Payroll", navKey: PAYROLL_NAV_KEY },
    { kind: "external", href: urls.hr, label: "HR" },
    {
      kind: "internal",
      href: "/",
      label: "Messages",
      isActive: (p) => p === "/" || p.startsWith("/c/"),
      navKey: MESSAGES_NAV_KEY,
    },
  ];
}

/** Messages' admin page (all messages) is for super admins only. */
export function messagesAdminSections(
  pathname: string,
  env?: NodeJS.ProcessEnv,
  options?: { includePlatformHub?: boolean; includeAppAdmin?: boolean }
): AdminNavSection[] {
  const items: AdminNavItem[] = [
    { href: "/admin", label: "All messages", isActive: (p) => p.startsWith("/admin") },
  ];
  return adminMenu("Messages", items, options, env);
}

export function updatesAdminSections(
  _pathname: string,
  options?: { includePlatformHub?: boolean; includeAppAdmin?: boolean }
): AdminNavSection[] {
  return adminMenu("Updates", updatesAdminItems(), options, undefined, true);
}

/** Updates' own admin pages (the Admin menu and the side menu of its admin area). */
export function updatesAdminItems(): AdminNavItem[] {
  return [
    {
      href: "/manage/updates",
      label: "Updates and reminders",
      isActive: (p) => p.startsWith("/manage/updates") || p.startsWith("/manage/archived-updates"),
    },
    {
      href: "/manage/key-dates",
      label: "Key dates",
      isActive: (p) => p.startsWith("/manage/key-dates") || p.startsWith("/manage/archived-key-dates"),
    },
    { href: "/manage/reminders", label: "Inactivity reminders", isActive: (p) => p.startsWith("/manage/reminders") },
    { href: "/manage/ticker", label: "Ticker", isActive: (p) => p.startsWith("/manage/ticker") },
    { href: "/manage/popup", label: "Pop-up message", isActive: (p) => p.startsWith("/manage/popup") },
    { href: "/manage/appearance", label: "Appearance", isActive: (p) => p.startsWith("/manage/appearance") },
    { href: "/manage/usage-stats", label: "Usage stats", isActive: (p) => p.startsWith("/manage/usage-stats") },
  ];
}

export function requestsAdminSections(
  pathname: string,
  env?: NodeJS.ProcessEnv,
  options?: { includePlatformHub?: boolean; includeAppAdmin?: boolean }
): AdminNavSection[] {
  const items: AdminNavItem[] = [{ href: "/admin", label: "Settings", isActive: (p) => p.startsWith("/admin") }];
  return adminMenu("Requests", items, options, env);
}

export function payrollAdminSections(
  env?: NodeJS.ProcessEnv,
  options?: { includePlatformHub?: boolean; includeAppAdmin?: boolean }
): AdminNavSection[] {
  const items: AdminNavItem[] = [
    { href: "/my-leave.html", label: "My time off", isActive: (p) => p === "/my-leave.html" },
    {
      href: "/index.html",
      label: "Analyzer",
      isActive: (p) => p === "/" || p === "/index.html",
    },
    { href: "/payroll-data.html", label: "Analytics", isActive: (p) => p === "/payroll-data.html" },
    { href: "/cases.html", label: "Case referrals", isActive: (p) => p === "/cases.html" },
    { href: "/rates.html", label: "Pay rates", isActive: (p) => p === "/rates.html" },
    { href: "/leave.html", label: "PTO & sick time", isActive: (p) => p === "/leave.html" },
    { href: "/pay-stubs.html", label: "Pay stubs", isActive: (p) => p === "/pay-stubs.html" },
  ];
  return adminMenu("Payroll", items, options, env);
}

export function hrAdminSections(
  pathname: string,
  env?: NodeJS.ProcessEnv,
  options?: { includePlatformHub?: boolean; includeAppAdmin?: boolean }
): AdminNavSection[] {
  const items: AdminNavItem[] = [
    { href: "/admin/employees", label: "Employees", isActive: (p) => p.startsWith("/admin/employees") },
    {
      href: "/admin/onboarding",
      label: "Onboarding",
      isActive: (p) => p.startsWith("/admin/onboarding"),
    },
    { href: "/admin/performance", label: "Review cycles", isActive: (p) => p.startsWith("/admin/performance") },
    {
      href: "/admin/acknowledgements",
      label: "Sign-off tracking",
      isActive: (p) => p.startsWith("/admin/acknowledgements"),
    },
  ];
  return adminMenu("HR", items, options, env);
}

export function vocHotlineAdminSections(
  pathname: string,
  env?: NodeJS.ProcessEnv,
  options?: { includePlatformHub?: boolean; includeAppAdmin?: boolean }
): AdminNavSection[] {
  const items: AdminNavItem[] = [
    { href: "/", label: "Voc hotline", isActive: (p) => p === "/" || p.startsWith("/chat") },
    { href: "/admin/usage", label: "Questions", isActive: (p) => p.startsWith("/admin/usage") },
    { href: "/admin/notes", label: "Best practices", isActive: (p) => p.startsWith("/admin/notes") },
    { href: "/admin/terminology", label: "Terminology", isActive: (p) => p.startsWith("/admin/terminology") },
    { href: "/admin/pages", label: "Pages and documents", isActive: (p) => p.startsWith("/admin/pages") },
    { href: "/admin/admins", label: "Settings", isActive: (p) => p.startsWith("/admin/admins") },
  ];
  return adminMenu("Voc hotline", items, options, env);
}
