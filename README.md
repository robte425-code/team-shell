# @team/shell

The shared TEAM header: cross-app navigation, admin menus, the **View as…** (impersonation) UI, and the server helpers that talk to the other TEAM apps. Used by Updates, Requests, HR, Voc hotline and Payroll, so a menu change is made once here instead of in every app.

## Installing in a Next.js app

Pin a tagged release:

```json
"dependencies": {
  "@team/shell": "github:robte425-code/team-shell#v1.0.0"
}
```

```js
// next.config.js — the package ships TypeScript source
transpilePackages: ["@team/shell"],
```

To roll out a change, tag a new release here and bump the tag in each app.

## Exports

| Import | What it is |
|---|---|
| `@team/shell` | `UserNav`, `AdminNavDropdown`, `ViewAsDropdown`, `ImpersonationBanner`, nav config, impersonation types, greeting helpers |
| `@team/shell/nav-config` | Canonical nav order, app URLs (`teamUrls()`), per-app admin sections |
| `@team/shell/impersonation` | `team_impersonate` cookie name and shared types |
| `@team/shell/impersonate-client` | Client helpers for `/api/impersonate` |
| `@team/shell/internal-urls` | `internalAppOrigin()`: origins for calls that carry `TEAM_INTERNAL_ACCESS_SECRET` (explicit `NEXT_PUBLIC_*_URL` only, never a default) |
| `@team/shell/super-admin-server` | Server-side super-admin check against Updates |
| `@team/shell/payroll-unread-server` | Server-side unread pay-stub check against Payroll |
| `@team/shell/styles/team-shell.css` | Header styles |

Each app implements `GET/POST/DELETE /api/impersonate` and `GET /api/view-as-users` itself, using the `team_impersonate` HttpOnly cookie. Impersonation is per app (per domain); it doesn't follow you across apps.

## Development

```bash
npm install
npm run typecheck
```

This repo is public: keep secrets, people's names and internal data out of it. App URLs are fine (they're public).
