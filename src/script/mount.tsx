/**
 * Browser-script build of the TEAM header for static HTML pages (TEAM Payroll's public/*.html).
 *
 * Built by `npm run build:script` into dist/team-shell.js (IIFE, React bundled, the CSS from
 * styles/team-shell.css injected). Loading it sets:
 *
 *   window.TeamShell = { mount, refreshPayrollNavBadge }
 *
 * mount() renders into #team-shell-root using the package's own components and nav config,
 * and returns a controller the page drives with its own API data (see ShellController).
 */
import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { AdminNavDropdown } from "../components/AdminNavDropdown";
import { ImpersonationBanner } from "../components/ImpersonationBanner";
import { UserNav } from "../components/UserNav";
import { ViewAsDropdown, type ViewAsChange } from "../components/ViewAsDropdown";
import type { ImpersonationStatus, ViewAsUser } from "../impersonation/constants";
import { payrollAdminSections, payrollUserNav, teamUrls } from "../nav-config";

/** Replaced at build time with the contents of styles/team-shell.css. */
declare const __TEAM_SHELL_CSS__: string;

const ROOT_ID = "team-shell-root";
const STYLE_ID = "team-shell-styles";
const IMPERSONATE_API = "/api/impersonate";
const VIEW_AS_USERS_API = "/api/view-as-users";

/** Nav URLs are the built-in defaults: a static page has no NEXT_PUBLIC_* env. */
const ENV = {} as NodeJS.ProcessEnv;

export type MountOptions = {
  /** "admin" pages check /api/impersonate on load to decide the Admin menu. */
  mode?: "employee" | "admin";
  /** Highlights the matching Admin menu item: "index", "leave", "rates", "pay-stubs", … */
  adminPage?: string | null;
  enableViewAs?: boolean;
  /** Called after view-as starts or ends. Without it the page reloads. */
  onViewAsChange?: () => void | Promise<void>;
  /** Logo image URL (default ./assets/team-logo.png, relative to the page). */
  logoSrc?: string;
};

/** The shape /api/my-leave returns (only the fields the header reads). */
export type MyLeaveMeta = {
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  effectiveIsAdmin?: boolean;
  impersonating?: boolean;
  employeeId?: string | number | null;
  employeeName?: string;
  employeeLoginEmail?: string;
  viewerEmployeeId?: string | number | null;
  viewerDisplayName?: string;
};

export type BannerData = {
  impersonating?: boolean;
  employeeName?: string;
  employeeLoginEmail?: string;
  target?: { name?: string; email?: string } | null;
};

export type ShellController = {
  /** Kept for API compatibility; the header shows no greeting. */
  setGreeting(name?: string): void;
  updateBanner(data: BannerData | null | undefined): void;
  applyMyLeaveMeta(data: MyLeaveMeta): void;
  refreshFromImpersonateApi(): Promise<boolean>;
};

type ShellState = {
  banner: { name: string; email: string } | null;
  viewAsVisible: boolean;
  adminVisible: boolean;
  includeAppAdmin: boolean;
  includePlatformHub: boolean;
  impersonating: boolean;
  realName: string;
  realEmail: string;
  currentEmail: string;
  viewerEmployeeId: string | null;
  activeEmployeeId: string | null;
  badgeKey: number;
};

type Store = {
  get(): ShellState;
  set(patch: Partial<ShellState>): void;
  subscribe(listener: () => void): () => void;
};

function createStore(initial: ShellState): Store {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      // Commit synchronously, like the hand-written header's direct DOM updates.
      flushSync(() => listeners.forEach((l) => l()));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

let mounted: { root: Root; store: Store } | null = null;

function injectStyles() {
  if (typeof __TEAM_SHELL_CSS__ !== "string" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = __TEAM_SHELL_CSS__;
  // First in <head>, so the page's own stylesheets can still override it.
  document.head.insertBefore(style, document.head.firstChild);
}

function idOrNull(v: unknown): string | null {
  return v === undefined || v === null || v === "" ? null : String(v);
}

async function loadPayrollUsers(): Promise<ViewAsUser[]> {
  const r = await fetch(VIEW_AS_USERS_API, { credentials: "same-origin" });
  const text = await r.text();
  let data: { users?: unknown; error?: string } = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Could not load users");
  }
  if (!r.ok) throw new Error(data.error || "Could not load users");
  const users = Array.isArray(data.users) ? data.users : [];
  return users.map((u: { id?: unknown; displayName?: string; providerId?: string; loginEmail?: string }) => ({
    id: String(u.id),
    displayName: u.displayName || u.providerId || String(u.id),
    email: String(u.loginEmail || "").trim(),
  }));
}

/** Refetches the Payroll unread pay-stub state for the nav badge. */
function refreshPayrollNavBadge(): Promise<void> {
  if (mounted) {
    const { store } = mounted;
    store.set({ badgeKey: store.get().badgeKey + 1 });
  }
  return Promise.resolve();
}

function Shell({
  store,
  options,
  onViewAsChange,
}: {
  store: Store;
  options: MountOptions;
  onViewAsChange?: (change: ViewAsChange | { type: "stop" }) => Promise<void>;
}) {
  const s = useSyncExternalStore(store.subscribe, store.get, store.get);
  const updatesUrl = teamUrls(ENV).updates.replace(/\/$/, "");
  const adminPathname = options.adminPage ? `/${options.adminPage}.html` : "";
  const sections = payrollAdminSections(ENV, {
    includeAppAdmin: s.includeAppAdmin,
    includePlatformHub: s.includePlatformHub,
  });

  return (
    <>
      {s.banner && (
        <ImpersonationBanner
          variant="plain"
          name={s.banner.name}
          email={s.banner.email}
          apiPath={IMPERSONATE_API}
          onChange={onViewAsChange ? () => onViewAsChange({ type: "stop" }) : undefined}
        />
      )}
      <header className="team-header">
        <div className="team-header-border">
          <div className="team-header-bar">
            <div className="team-header-left">
              <a href={`${updatesUrl}/`} className="team-header-logo">
                <img
                  src={options.logoSrc || "./assets/team-logo.png"}
                  alt="Team Vocational Services"
                  width={220}
                  height={80}
                />
              </a>
              <nav className="team-header-nav" aria-label="Main">
                <UserNav
                  variant="plain"
                  links={payrollUserNav(window.location.pathname, ENV)}
                  pathname={window.location.pathname}
                  LinkComponent="a"
                  refreshKey={String(s.badgeKey)}
                />
              </nav>
            </div>
            <div className="team-header-right">
              {options.enableViewAs && s.viewAsVisible && (
                <ViewAsDropdown
                  variant="plain"
                  identifyBy="employeeId"
                  realEmail={s.realEmail}
                  realName={s.realName}
                  realUserId={s.viewerEmployeeId}
                  currentEmail={s.currentEmail}
                  currentUserId={s.activeEmployeeId}
                  isImpersonating={s.impersonating}
                  impersonateApiPath={IMPERSONATE_API}
                  usersApiPath={VIEW_AS_USERS_API}
                  loadUsers={loadPayrollUsers}
                  onChange={onViewAsChange}
                />
              )}
              {s.adminVisible && sections.length > 0 && (
                <AdminNavDropdown
                  variant="plain"
                  sections={sections}
                  pathname={adminPathname}
                  LinkComponent="a"
                />
              )}
              <a href="/logout" className="team-header-signout">
                Sign out
              </a>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

function mount(options: MountOptions = {}): ShellController | null {
  const el = document.getElementById(ROOT_ID);
  if (!el) return null;
  injectStyles();

  const mode = options.mode || "employee";
  // As before: the Admin menu exists on admin pages and on pages with view-as.
  const adminNavAllowed = mode === "admin" || Boolean(options.enableViewAs);

  const store = createStore({
    banner: null,
    viewAsVisible: false,
    adminVisible: false,
    includeAppAdmin: true,
    includePlatformHub: false,
    impersonating: false,
    realName: "Yourself",
    realEmail: "",
    currentEmail: "",
    viewerEmployeeId: null,
    activeEmployeeId: null,
    badgeKey: 0,
  });

  function applyAdminNavAccess(a: { effectiveIsAdmin: boolean; isRealSuperAdmin: boolean; impersonating: boolean }) {
    const includeAppAdmin = Boolean(a.effectiveIsAdmin);
    const includePlatformHub = Boolean(a.isRealSuperAdmin && !a.impersonating);
    store.set({
      includeAppAdmin,
      includePlatformHub,
      adminVisible: adminNavAllowed && (includeAppAdmin || includePlatformHub),
    });
  }

  function updateBanner(data: BannerData | null | undefined) {
    if (data && data.impersonating) {
      store.set({
        banner: {
          name: data.employeeName || data.target?.name || "employee",
          email: data.employeeLoginEmail || data.target?.email || "",
        },
      });
    } else {
      store.set({ banner: null });
    }
  }

  const userOnChange = options.onViewAsChange;
  const onViewAsChange =
    typeof userOnChange === "function"
      ? async (change: ViewAsChange | { type: "stop" }) => {
          if (change.type === "stop") {
            store.set({ banner: null, impersonating: false, activeEmployeeId: null, currentEmail: "" });
          }
          try {
            await userOnChange();
          } catch (e) {
            console.error(e);
          }
          void refreshPayrollNavBadge();
        }
      : undefined; // the components reload the page

  const controller: ShellController = {
    setGreeting() {},
    updateBanner,
    applyMyLeaveMeta(data) {
      if (data.isAdmin) {
        store.set({
          viewerEmployeeId: idOrNull(data.viewerEmployeeId),
          realName: data.viewerDisplayName || "Yourself",
          viewAsVisible: !data.impersonating,
        });
      }
      applyAdminNavAccess({
        effectiveIsAdmin: Boolean(data.effectiveIsAdmin),
        isRealSuperAdmin: Boolean(data.isSuperAdmin),
        impersonating: Boolean(data.impersonating),
      });
      const impersonating = Boolean(data.impersonating && data.employeeId);
      store.set({
        impersonating,
        activeEmployeeId: impersonating ? idOrNull(data.employeeId) : null,
        currentEmail: impersonating ? String(data.employeeLoginEmail || "") : "",
      });
      updateBanner(data);
      void refreshPayrollNavBadge();
    },
    async refreshFromImpersonateApi() {
      try {
        const r = await fetch(IMPERSONATE_API, { credentials: "same-origin", cache: "no-store" });
        const status: ImpersonationStatus | null = r.ok ? await r.json() : null;
        if (!status) return false;
        store.set({
          viewAsVisible: Boolean(status.canImpersonate),
          impersonating: Boolean(status.impersonating),
          realName: status.real?.name || "Yourself",
          realEmail: status.real?.email || "",
          currentEmail: status.target?.email || "",
        });
        applyAdminNavAccess({
          effectiveIsAdmin: status.effective?.role === "admin",
          isRealSuperAdmin: Boolean(status.real?.isSuperAdmin),
          impersonating: Boolean(status.impersonating),
        });
        updateBanner(
          status.impersonating && status.target
            ? { impersonating: true, employeeName: status.target.name, employeeLoginEmail: status.target.email }
            : { impersonating: false }
        );
        void refreshPayrollNavBadge();
        return true;
      } catch {
        return false;
      }
    },
  };

  if (mounted) mounted.root.unmount();
  el.innerHTML = "";
  const root = createRoot(el);
  mounted = { root, store };
  flushSync(() => root.render(<Shell store={store} options={options} onViewAsChange={onViewAsChange} />));

  if (mode === "admin") {
    void controller.refreshFromImpersonateApi().then((handled) => {
      if (!handled) applyAdminNavAccess({ effectiveIsAdmin: true, isRealSuperAdmin: false, impersonating: false });
    });
  }

  return controller;
}

(window as unknown as { TeamShell: unknown }).TeamShell = { mount, refreshPayrollNavBadge };
