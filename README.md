# @team/shell

The shared TEAM header: cross-app navigation, admin menus, the **View as…** (impersonation) UI, and the server helpers that talk to the other TEAM apps. Used by Updates, Messages, Requests, HR, Voc hotline and Payroll, so a menu change is made once here instead of in every app.

## Installing in a Next.js app

Pin a tagged release:

```json
"dependencies": {
  "@team/shell": "git+https://github.com/robte425-code/team-shell.git#v1.4.0"
}
```

```js
// next.config.js — the package ships TypeScript source
transpilePackages: ["@team/shell"],
```

npm records it in the lockfile as `git+ssh://…`, but installs it as an HTTPS tarball, so Vercel and CI need no SSH key.

To roll out a change, tag a new release here and bump the tag in each app.

## The header

`TeamHeader` is the whole header: logo, the cross-app links, the app's Admin menu (the app's own pages, then "All TEAM apps" with the Access and Backup hubs for super admins), and an account menu with who you are, **View as someone else…** and **Sign out**. It stays at the top while you scroll, and below 1024px the links and the Admin menu fold into a menu button.

```tsx
<TeamHeader
  homeHref="/"                         // or teamUrls().updates from the other apps
  LinkComponent={Link}
  pathname={pathname}
  links={updatesUserNav(pathname)}     // null while signed out
  adminSections={updatesAdminSections(pathname, { includeAppAdmin, includePlatformHub })}
  user={{ name, email, roleLabel: "Super admin" }}
  viewAs={isRealAdmin && !impersonating ? { realEmail, realName, currentEmail, isImpersonating } : null}
  onSignOut={() => signOut({ callbackUrl: "/login" })}
  banner={impersonating ? <ImpersonationBanner name={…} email={…} /> : null}
>
  {/* optional: shown inside the header under the bar, e.g. Updates' ticker */}
</TeamHeader>
```

Line content up under it with `pageContainer` from `@team/shell/ui` (1200px, the same side padding).

## Building blocks (`@team/shell/ui`)

The shared look as Tailwind classes and small React components, so every app's pages match: a neutral stone palette, near-black main buttons, blue links and focus rings, and green / amber / red / blue status labels. The apps' Tailwind content scan already includes this package's `src/`.

- Classes: `pageContainer`, `buttonClass()`, `input`, `select`, `textarea`, `card`, `table`, `link`, `chipTones`, `cx()`
- Components: `Button`, `Chip`, `PageHeader`, `Card`, `StatTiles` / `StatTile`, `SearchInput`, `FilterBar`, `Tabs` / `TabLinks`, `Field`, `Switch`, `EmptyState`, `InlineNotice`, `Avatar`, `SignInCard`
- Overlays: `SidePanel` (create and edit one thing at a time), `Dialog`, `ActionMenu` (the "⋯" row menu), `useConfirm()` (in place of `window.confirm`), and `NoticeProvider` / `useNotice()` for the "Saved" notice

Side panels and dialogs trap focus, close on Escape and return focus to where it was; menus work with the arrow keys.

## Static HTML pages (browser script)

For pages without a bundler (TEAM Payroll's `public/*.html`), `dist/team-shell.js` is a prebuilt script: an IIFE with React and ReactDOM bundled and `styles/team-shell.css` injected into the page (as a `<style>` placed first in `<head>`, so the page's own stylesheets can still override it). There is no separate CSS file. It renders the same components and nav config as the React apps, with their `variant="plain"` class names.

Install the package as above (no build step: the built file is committed), copy `node_modules/@team/shell/dist/team-shell.js` into the app's public folder (Payroll does this in `postinstall` and before `next build`), and load it:

```html
<div id="team-shell-root"></div>
<script src="./js/team-shell.js"></script>
<script>
  const shell = TeamShell.mount({
    mode: "admin",            // "admin" pages ask /api/impersonate who you are; "employee" pages
                              // pass /api/my-leave data in via shell.applyMyLeaveMeta(data)
    adminPage: "rates",       // highlights /rates.html in the Admin menu
    enableViewAs: true,       // View as… by employee id (/api/view-as-users, POST/DELETE /api/impersonate)
    onViewAsChange: () => window.location.assign("./my-leave.html"), // default: reload
  });
  // later, e.g. after a pay stub download:
  TeamShell.refreshPayrollNavBadge();
</script>
```

`mount()` returns a controller with `applyMyLeaveMeta(data)`, `updateBanner(data)`, `refreshFromImpersonateApi()` and `setGreeting()` (a no-op). It renders `TeamHeader` with `variant="plain"`: the impersonation banner, the cross-app nav with the Payroll unread badge (`/api/payroll-unread`), the Admin menu (`payrollAdminSections`, plus the Access/Backup hub for super admins when not viewing as someone), and the account menu with **View as…** and **Sign out** (`/logout`).

## Exports

| Import | What it is |
|---|---|
| `@team/shell` | `TeamHeader`, `ImpersonationBanner`, `UserNav`, `AdminNavDropdown`, `ViewAsDropdown`, `useViewAs`, nav config, impersonation types, greeting helpers |
| `@team/shell/ui` | The shared look: classes and building blocks (see above) |
| `@team/shell/nav-config` | Canonical nav order, app URLs (`teamUrls()`), per-app admin sections |
| `@team/shell/impersonation` | `team_impersonate` cookie name and shared types |
| `@team/shell/impersonate-client` | Client helpers for `/api/impersonate` |
| `@team/shell/internal-urls` | `internalAppOrigin()`: origins for calls that carry `TEAM_INTERNAL_ACCESS_SECRET` (explicit `NEXT_PUBLIC_*_URL` only, never a default) |
| `@team/shell/super-admin-server` | Server-side super-admin check against Updates |
| `@team/shell/payroll-unread-server` | Server-side unread pay-stub check against Payroll |
| `@team/shell/messages-unread-server` | Server-side unread message count from Messages (see below) |
| `@team/shell/active-staff` | Server-side `onlyActiveStaff()` / `fetchActiveEmails()`: who HR lists as active, for View as (see below) |
| `@team/shell/emergency-sign-in-server` | Server-side emergency sign-in against HR: on/off, send a code, check a code (see below) |
| `@team/shell/appearance` | Server-side `sharedColorScheme()`: the color scheme chosen in Updates, as CSS variables (see below) |
| `@team/shell/styles/team-shell.css` | Header styles (plain class names) |
| `@team/shell/dist/team-shell.js` | Prebuilt browser script for static pages (see above) |

Each app implements `GET/POST/DELETE /api/impersonate` and `GET /api/view-as-users` itself, using the `team_impersonate` HttpOnly cookie. Impersonation is per app (per domain); it doesn't follow you across apps.

## The Messages badge

Every app's menu has a **Messages** link (last). `UserNav` puts a red dot on it, like the Payroll pay-stub dot, when the person has unread messages (the count is in its tooltip): it asks the app's own `GET /api/messages-unread` on load, every minute while the page is visible, and when the tab comes back into view. Each app answers from the server with `fetchMessagesUnreadForEmail()`, which asks Messages' `GET /api/internal/unread` with `TEAM_INTERNAL_ACCESS_SECRET` (and needs `NEXT_PUBLIC_MESSAGES_URL`):

```ts
// app/api/messages-unread/route.ts → { unread: number }
import { fetchMessagesUnreadForEmail } from "@team/shell/messages-unread-server";
export async function GET() {
  const user = await getCurrentUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await fetchMessagesUnreadForEmail(user.email));
}
```

An app without the route shows no count. The Messages app itself fires `MESSAGES_UNREAD_EVENT` on `window` with its count so the badge changes as soon as messages are read.

## Server helpers for the other apps

Server only (route handlers, layouts, `getInitialProps`): they send `TEAM_INTERNAL_ACCESS_SECRET` to the origin from `internalAppOrigin()`, and return a safe fallback when it isn't configured or the other app can't be reached.

```ts
// View as: offer only people HR lists as active (HR's GET /api/internal/active-staff).
// Kept in memory for a minute, one shared refresh; everyone, if HR can't be asked.
import { onlyActiveStaff } from "@team/shell/active-staff";
const users = await onlyActiveStaff(allUsers, (u) => u.email);

// The color scheme chosen in Updates (GET /api/internal/appearance), as CSS variables for <body>.
// Null when Updates can't be asked; the app's globals.css defaults apply then.
import { sharedColorScheme } from "@team/shell/appearance";
const scheme = await sharedColorScheme({ revalidate: 60 }); // App Router: Next's data cache
const scheme = await sharedColorScheme();                   // Pages Router / elsewhere: kept in memory for a minute
```

## Emergency sign-in

For when Microsoft sign-in is down. HR emails a one-time code to the person's personal email (HR admins keep it on each employee) and checks it; HR admins turn it on from HR's Employees page for a set time (4 hours to 3 days), after which it turns itself off; there's nothing to set or redeploy, and every app follows within a minute. Turning it off also stops codes already sent and ends the sign-ins they started. (`EMERGENCY_SIGN_IN` on HR remains only as a last-resort override.) A code (8 digits) is good for one app, once, for 10 minutes, and a sign-in made with one lasts at most 12 hours. Each app:

```ts
// GET → { enabled }, POST { email } → always { ok: true } (503 when off), so nobody learns who works here.
import { clientIpFrom, emergencySignInEnabledRemote, requestEmergencyCodeRemote } from "@team/shell/emergency-sign-in-server";

// NextAuth: a credentials provider with id "emergency-code" ({ email, code }); the signIn callback still decides access.
import { verifyEmergencyCodeRemote } from "@team/shell/emergency-sign-in-server";
const user = await verifyEmergencyCodeRemote({ email, app: "payroll", code, ip: clientIpFrom(req?.headers) }); // null unless the code is right

// NextAuth jwt callback: code sign-ins end after 12 hours, or as soon as HR's switch is off.
import { emergencySessionEnded } from "@team/shell/emergency-sign-in-server";
if (await emergencySessionEnded(token, account)) throw new Error("Emergency sign-in session ended.");

// Sign-in page: wait for the status before sending people to Microsoft, and skip that while it's on.
import { EmergencySignIn, useEmergencySignIn } from "@team/shell/ui";
const emergency = useEmergencySignIn(); // "loading" | "on" | "off"
{emergency === "on" ? <EmergencySignIn appName="Payroll" signIn={signIn} callbackUrl={callbackUrl} /> : null}
```

Before asking HR, each app's `POST /api/emergency-sign-in` refuses an address outside its own `ALLOWED_DOMAIN` (the same rule its sign-in uses) with 400 `notTeamAddressBody()`, and the form then says to use the TEAM address. People often type their personal one, since that's where the code goes, and HR would quietly send nothing. The answer reflects only the domain rule, never who works here:

```ts
import { notTeamAddressBody } from "@team/shell/emergency-sign-in-server";
if (!isAllowedDomain(String(body.email ?? "").trim())) return NextResponse.json(notTeamAddressBody(), { status: 400 });
```

HR calls its own code directly rather than these helpers.

Updates serves the appearance endpoint and HR serves the active-staff one, so neither calls its own. TEAM Payroll's server code is CommonJS JavaScript (`require`) and can't load these TypeScript modules, so it keeps its own copy of the active-staff check in `lib/active-staff.js`.

## Development

```bash
npm install
npm run typecheck
npm run build:script   # rebuild dist/team-shell.js after changing src/ or styles/
npm run check:dist     # fails if the committed dist/team-shell.js is stale
```

`dist/team-shell.js` is generated by `scripts/build-script.mjs` (esbuild, entry `src/script/mount.tsx`) and committed, because apps install from git without building. Any change to `src/` or `styles/` needs `npm run build:script` and the rebuilt file in the same commit; run `npm run check:dist` before tagging.

This repo is public: keep secrets, people's names and internal data out of it. App URLs are fine (they're public).
