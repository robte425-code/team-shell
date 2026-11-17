import { useEffect, useSyncExternalStore } from "react";

/**
 * Browser side of everyone's circle color. Each person picks theirs in HR (My profile); HR
 * gives everyone a different one. The app serves them, signed-in only, at
 * GET /api/team/avatar-colors → { colors: { "<sign-in email>": "#rrggbb" } }
 * (see avatarColorsByEmail in ./active-staff for the server side).
 *
 * Loaded on the first circle that asks, and shared by every circle on the page. A failed load
 * is tried again after half a minute; a tab left open (Messages, say) picks up changed colors
 * when it's looked at again after five minutes. Until colors arrive, and for anyone without one
 * (people outside TEAM, or when HR can't be reached), circles keep their neutral look. The
 * initials are white on every color HR offers.
 */

export const AVATAR_COLORS_PATH = "/api/team/avatar-colors";

export type AvatarColors = Readonly<Record<string, string>>;

const HEX = /^#[0-9a-f]{6}$/;
const EMPTY: AvatarColors = Object.freeze({});
const RETRY_MS = 30 * 1000;
const REFRESH_MS = 5 * 60 * 1000;

let endpoint = AVATAR_COLORS_PATH;
let colors: AvatarColors = EMPTY;
let data: unknown = null;
let loadedAt = 0;
let failedAt = 0;
let pending: Promise<AvatarColors> | null = null;
let watchingVisibility = false;
let now = () => Date.now();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

const key = (email: string | null | undefined) => String(email ?? "").trim().toLowerCase();

/** A #rrggbb color (lower-case), or null for anything else. */
export function cleanAvatarColor(value: unknown): string | null {
  const color = String(value ?? "").trim().toLowerCase();
  return HEX.test(color) ? color : null;
}

/** Only well-formed emails and colors, keyed by lower-cased email. */
export function cleanAvatarColors(raw: unknown): AvatarColors {
  const out: Record<string, string> = {};
  if (raw && typeof raw === "object") {
    for (const [email, value] of Object.entries(raw as Record<string, unknown>)) {
      const k = key(email);
      const color = cleanAvatarColor(value);
      if (k.includes("@") && color) out[k] = color;
    }
  }
  return Object.freeze(out);
}

function sameColors(a: AvatarColors, b: AvatarColors) {
  const ak = Object.keys(a);
  return ak.length === Object.keys(b).length && ak.every((k) => a[k] === b[k]);
}

/** For an app that serves the colors somewhere else (call before the first circle renders). */
export function setAvatarColorsEndpoint(url: string) {
  endpoint = url;
}

/** Look again when someone comes back to a tab that has been open a while. */
function watchVisibility() {
  if (watchingVisibility || typeof document === "undefined") return;
  watchingVisibility = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void loadAvatarColors();
  });
}

/**
 * Fetch the colors, shared by every caller on the page: once to start, again after a failure
 * (no sooner than 30 seconds later) or when they're over five minutes old. `force` asks now.
 */
export function loadAvatarColors(force = false): Promise<AvatarColors> {
  if (typeof fetch !== "function") return Promise.resolve(colors);
  if (pending) return pending;
  const t = now();
  if (!force) {
    if (loadedAt && t - loadedAt < REFRESH_MS) return Promise.resolve(colors);
    if (!loadedAt && failedAt && t - failedAt < RETRY_MS) return Promise.resolve(colors);
  }
  watchVisibility();
  pending = fetch(endpoint, { credentials: "same-origin", cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = (await res.json()) as { colors?: unknown };
      const next = cleanAvatarColors(body?.colors);
      data = body;
      loadedAt = now();
      if (!sameColors(next, colors)) {
        colors = next;
        emit();
      }
      return colors;
    })
    .catch(() => {
      failedAt = now();
      return colors;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

/**
 * The whole answer from the colors route, through the same shared request. For an app whose
 * route sends more than `colors` (HR also sends colors by its own employee id).
 */
export async function loadAvatarColorsData(): Promise<unknown> {
  await loadAvatarColors();
  return data;
}

/** The color loaded for `email`, or null (not loaded yet, or no color). */
export function avatarColorFor(email: string | null | undefined): string | null {
  return colors[key(email)] ?? null;
}

/** Show a change straight away, without waiting for the next page load (HR's My profile uses it). */
export function setAvatarColor(email: string | null | undefined, color: string | null) {
  const k = key(email);
  if (!k.includes("@")) return;
  const next: Record<string, string> = { ...colors };
  const clean = cleanAvatarColor(color);
  if (clean) next[k] = clean;
  else delete next[k];
  colors = Object.freeze(next);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = () => colors;
const serverSnapshot = () => EMPTY;

/** The circle color for `email`, loading everyone's colors on first use. Null until known. */
export function useAvatarColor(email: string | null | undefined): string | null {
  const all = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const k = key(email);
  useEffect(() => {
    if (k.includes("@")) void loadAvatarColors();
  }, [k]);
  return all[k] ?? null;
}

/** For tests: forget everything loaded, and optionally replace the clock. */
export function resetAvatarColorsForTests(clock?: () => number) {
  colors = EMPTY;
  data = null;
  loadedAt = 0;
  failedAt = 0;
  pending = null;
  endpoint = AVATAR_COLORS_PATH;
  now = clock ?? (() => Date.now());
}
