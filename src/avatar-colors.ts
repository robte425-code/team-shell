import { useEffect, useSyncExternalStore } from "react";

/**
 * Browser side of everyone's circle color. Each person picks theirs in HR (My profile); HR
 * gives everyone a different one. The app serves them, signed-in only, at
 * GET /api/team/avatar-colors → { colors: { "<sign-in email>": "#rrggbb" } }
 * (see avatarColorsByEmail in ./active-staff for the server side).
 *
 * Loaded once per page, on the first circle that asks. Until then, and for anyone without a
 * color (people outside TEAM, or when HR can't be reached), circles keep their neutral look.
 * The initials are white on every color HR offers.
 */

export const AVATAR_COLORS_PATH = "/api/team/avatar-colors";

export type AvatarColors = Readonly<Record<string, string>>;

const HEX = /^#[0-9a-f]{6}$/;
const EMPTY: AvatarColors = Object.freeze({});

let endpoint = AVATAR_COLORS_PATH;
let colors: AvatarColors = EMPTY;
let loaded = false;
let pending: Promise<AvatarColors> | null = null;
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

/** For an app that serves the colors somewhere else (call before the first circle renders). */
export function setAvatarColorsEndpoint(url: string) {
  endpoint = url;
}

/**
 * Fetch the colors once per page (concurrent callers share the request). A failed request
 * leaves circles neutral and isn't retried until `force`.
 */
export function loadAvatarColors(force = false): Promise<AvatarColors> {
  if (typeof fetch !== "function") return Promise.resolve(colors);
  if (loaded && !force) return Promise.resolve(colors);
  if (!pending) {
    pending = fetch(endpoint, { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return colors;
        const data = (await res.json().catch(() => ({}))) as { colors?: unknown };
        colors = cleanAvatarColors(data.colors);
        emit();
        return colors;
      })
      .catch(() => colors)
      .finally(() => {
        loaded = true;
        pending = null;
      });
  }
  return pending;
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

/** For tests: forget everything loaded. */
export function resetAvatarColorsForTests() {
  colors = EMPTY;
  loaded = false;
  pending = null;
  endpoint = AVATAR_COLORS_PATH;
}
