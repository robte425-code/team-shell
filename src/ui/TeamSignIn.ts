"use client";

import { useEffect, useRef, useState } from "react";
import { useEmergencySignIn } from "./EmergencySignIn";

/**
 * The same sign-in and sign-out in every TEAM app.
 *
 * useTeamAutoSignIn: arriving at a sign-in page signed out goes straight through Microsoft:
 * silently if this browser is already signed in there, else Microsoft's own page, once per tab.
 * It doesn't when you've just signed out (?signedOut=1), after "no access", or while emergency
 * sign-in is on: then the page shows its button (and the code form).
 *
 * teamSignOut: signs out of every TEAM app (via the app's POST /api/sign-out, which tells HR)
 * and out of Microsoft in this browser, landing on the sign-in page with ?signedOut=1.
 */

type SignInResult = { ok?: boolean; error?: string | null; url?: string | null } | undefined | void;
type SignInFn = (provider?: string, options?: Record<string, unknown>, params?: Record<string, string>) => Promise<SignInResult>;
type SignOutFn = (options?: { redirect?: boolean; callbackUrl?: string }) => Promise<unknown>;

export const SIGNED_OUT_PARAM = "signedOut";
const TRIED_KEY = "team_sso_interactive";
// Automatic sign-ins in this tab (times, ms). If the app keeps sending people back here right
// after Microsoft signs them in, stop after a few tries instead of looping (Microsoft blocks a
// loop with AADSTS50196, for every TEAM app, since they share one app registration).
const ATTEMPTS_KEY = "team_sso_attempts";
const MAX_AUTO_ATTEMPTS = 3;
const ATTEMPT_WINDOW_MS = 2 * 60 * 1000;

function readAttempts(now: number): number[] {
  try {
    const list = JSON.parse(sessionStorage.getItem(ATTEMPTS_KEY) || "[]");
    return Array.isArray(list) ? list.filter((t) => typeof t === "number" && now - t < ATTEMPT_WINDOW_MS) : [];
  } catch {
    return [];
  }
}

/** Notes an automatic sign-in; false when there have been too many lately (show the button). */
function mayAutoSignIn(now = Date.now()): boolean {
  const recent = readAttempts(now);
  if (recent.length >= MAX_AUTO_ATTEMPTS) return false;
  try {
    sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify([...recent, now]));
  } catch {
    /* private mode */
  }
  return true;
}

function clearAttempts() {
  try {
    sessionStorage.removeItem(ATTEMPTS_KEY);
  } catch {
    /* private mode */
  }
}

export type TeamSignInPhase = "checking" | "redirecting" | "manual";

export function useTeamAutoSignIn({
  signIn,
  callbackUrl = "/",
  error,
  signedOut = false,
  ready = true,
  enabled = true,
}: {
  signIn: SignInFn;
  callbackUrl?: string;
  /** NextAuth's ?error= on the sign-in page, if any. */
  error?: string | null;
  /** True right after signing out (?signedOut=1): stay on the page. */
  signedOut?: boolean;
  /** False until the page knows its query (Pages Router: router.isReady). */
  ready?: boolean;
  /** False where Microsoft sign-in isn't set up (local copies). */
  enabled?: boolean;
}): TeamSignInPhase {
  const emergency = useEmergencySignIn();
  const [phase, setPhase] = useState<TeamSignInPhase>("checking");
  const started = useRef(false);

  useEffect(() => {
    if (!ready || emergency === "loading" || started.current) return;
    started.current = true;
    if (!enabled || emergency === "on" || signedOut || error === "AccessDenied") {
      if (signedOut) {
        sessionStorage.removeItem(TRIED_KEY);
        clearAttempts();
      }
      setPhase("manual");
      return;
    }
    if (!mayAutoSignIn()) {
      setPhase("manual");
      return;
    }
    if (!error) {
      // Fresh arrival: try silently. With a Microsoft session this comes straight back signed in.
      sessionStorage.removeItem(TRIED_KEY);
      setPhase("redirecting");
      void signIn("azure-ad", { callbackUrl }, { prompt: "none" });
      return;
    }
    // The silent try came back with an error (usually: not signed in to Microsoft). Once per tab,
    // show Microsoft's own sign-in page; after that, stop and show the button.
    if (sessionStorage.getItem(TRIED_KEY) !== "1") {
      sessionStorage.setItem(TRIED_KEY, "1");
      setPhase("redirecting");
      void signIn("azure-ad", { callbackUrl });
      return;
    }
    setPhase("manual");
  }, [ready, emergency, enabled, signedOut, error, callbackUrl, signIn]);

  return phase;
}

/** The "Sign in with Microsoft" button's action: Microsoft's page, remembering it was tried. */
export function signInWithMicrosoft(signIn: SignInFn, callbackUrl = "/") {
  try {
    sessionStorage.setItem(TRIED_KEY, "1");
    clearAttempts();
  } catch {
    /* private mode */
  }
  return signIn("azure-ad", { callbackUrl });
}

/**
 * Sign out of every TEAM app and of Microsoft. Pass next-auth's signOut. The app's POST
 * /api/sign-out records it with HR and returns where to go next (Microsoft's sign-out page,
 * or straight to the sign-in page for emergency-code sessions).
 */
export async function teamSignOut(signOut: SignOutFn, url = "/api/sign-out") {
  let next = `/login?${SIGNED_OUT_PARAM}=1`;
  try {
    const res = await fetch(url, { method: "POST" });
    const data = (await res.json()) as { next?: string };
    if (data.next) next = data.next;
  } catch {
    /* still sign out here */
  }
  await signOut({ redirect: false });
  window.location.assign(next);
}
