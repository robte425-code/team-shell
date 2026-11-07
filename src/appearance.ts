import { INTERNAL_FETCH_TIMEOUT_MS, internalAppOrigin } from "./internal-urls";

/**
 * Server only. The color scheme chosen in Updates (Manage → Appearance), as CSS variables
 * for <body>, read from Updates' GET /api/internal/appearance with TEAM_INTERNAL_ACCESS_SECRET.
 */

export type ColorSchemeVars = Record<string, string>;

export type SharedColorSchemeOptions = {
  env?: NodeJS.ProcessEnv;
  /**
   * App Router only: cache the answer in Next.js's data cache for this many seconds
   * (fetch's `next: { revalidate }`), so a statically rendered layout stays static. The
   * in-memory cache is then skipped.
   *
   * Leave it out elsewhere (Pages Router getInitialProps, plain Node): the answer is kept in
   * memory for a minute instead, and concurrent callers share one request.
   */
  revalidate?: number;
};

const CACHE_MS = 60 * 1000;
let cached: { at: number; vars: ColorSchemeVars | null } = { at: 0, vars: null };
let pending: Promise<void> | null = null;

/** Only our own variables, and only plain color values, ever reach the page. */
function pickColorVars(raw: unknown): ColorSchemeVars | null {
  const vars: ColorSchemeVars = {};
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  for (const [name, value] of Object.entries(source)) {
    if (/^--[a-z-]+$/.test(name) && typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value)) {
      vars[name] = value;
    }
  }
  return Object.keys(vars).length > 0 ? vars : null;
}

async function fetchColorScheme(env: NodeJS.ProcessEnv, revalidate?: number): Promise<ColorSchemeVars | null> {
  const secret = env.TEAM_INTERNAL_ACCESS_SECRET?.trim();
  const updates = internalAppOrigin("updates", env);
  if (!secret || !updates) return null;
  // `next` is read by Next.js's App Router fetch and ignored everywhere else.
  const init: RequestInit & { next?: { revalidate: number } } = {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(INTERNAL_FETCH_TIMEOUT_MS),
  };
  if (revalidate !== undefined) init.next = { revalidate };
  try {
    const res = await fetch(`${updates}/api/internal/appearance`, init);
    if (!res.ok) return null;
    const data = (await res.json()) as { vars?: unknown } | null;
    return pickColorVars(data?.vars);
  } catch {
    return null;
  }
}

/**
 * The shared color scheme as CSS variables, or null when Updates can't be reached or isn't
 * configured (the app's own defaults in globals.css apply then). A change in Updates shows
 * up within about a minute.
 *
 *   App Router layout:          await sharedColorScheme({ revalidate: 60 })
 *   Pages Router _document.js:  await sharedColorScheme()
 */
export async function sharedColorScheme(options: SharedColorSchemeOptions = {}): Promise<ColorSchemeVars | null> {
  const env = options.env ?? process.env;
  if (options.revalidate !== undefined) return fetchColorScheme(env, options.revalidate);
  if (Date.now() - cached.at >= CACHE_MS) {
    if (!pending) {
      pending = fetchColorScheme(env)
        .then((vars) => {
          cached = { at: Date.now(), vars };
        })
        .finally(() => {
          pending = null;
        });
    }
    await pending;
  }
  return cached.vars;
}
