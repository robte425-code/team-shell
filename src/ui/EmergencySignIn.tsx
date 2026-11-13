"use client";

import { useEffect, useState, type FormEvent } from "react";
import { buttonClass, cx, input, link } from "./styles";

/**
 * Emergency sign-in on the shared sign-in page, for when Microsoft sign-in is
 * down: the person types their work email, gets a one-time code at their
 * personal email (HR sends it), and types the code here.
 *
 * Each app provides:
 *   - GET/POST /api/emergency-sign-in (status, and "send me a code")
 *   - a NextAuth credentials provider with id "emergency-code" ({ email, code })
 * and passes next-auth's signIn in, so this package doesn't depend on next-auth.
 */

export type EmergencySignInState = "loading" | "on" | "off";

/**
 * Whether emergency sign-in is on. A sign-in page that sends people straight to
 * Microsoft should wait for this and skip that while it's "on": during an outage
 * the redirect would strand them on Microsoft's error page.
 */
export function useEmergencySignIn(url = "/api/emergency-sign-in"): EmergencySignInState {
  const [state, setState] = useState<EmergencySignInState>("loading");
  useEffect(() => {
    let live = true;
    fetch(url, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { enabled: false }))
      .then((data: { enabled?: boolean }) => live && setState(data.enabled === true ? "on" : "off"))
      .catch(() => live && setState("off"));
    return () => {
      live = false;
    };
  }, [url]);
  return state;
}

type SignInResult = { ok?: boolean; error?: string | null; url?: string | null } | undefined;
type SignInFn = (provider: string, options: Record<string, unknown>) => Promise<SignInResult>;

export function EmergencySignIn({
  appName,
  signIn,
  callbackUrl = "/",
  url = "/api/emergency-sign-in",
}: {
  /** "HR", "Payroll"…, for the messages. */
  appName: string;
  /** next-auth/react's signIn. */
  signIn: SignInFn;
  callbackUrl?: string;
  url?: string;
}) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    const work = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(work)) {
      setError("Enter your TEAM work email.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: work }),
      });
      if (res.status === 503) {
        setError("Emergency sign-in has been switched off. Try Sign in with Microsoft.");
        return;
      }
      if (!res.ok) throw new Error();
      setCode("");
      setStep("code");
    } catch {
      setError("Couldn’t send a code just now. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const typed = code.replace(/[\s-]/g, "");
    if (!/^\d{8}$/.test(typed)) {
      setError("The code is 8 digits.");
      return;
    }
    setBusy(true);
    try {
      const result = await signIn("emergency-code", {
        email: email.trim(),
        code: typed,
        callbackUrl,
        redirect: false,
      });
      if (result?.ok && !result.error) {
        window.location.assign(result.url || callbackUrl);
        return;
      }
      setError(
        result?.error === "AccessDenied"
          ? `Your account doesn’t have access to ${appName}.`
          : "That code didn’t work. Check it, or send a new one: codes last 10 minutes and work once."
      );
    } catch {
      setError("Sign-in failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="emergency-sign-in-title" className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-4">
      <h2 id="emergency-sign-in-title" className="text-sm font-semibold text-stone-900">
        Microsoft sign-in not working?
      </h2>
      {step === "email" ? (
        <form onSubmit={sendCode} className="mt-2 space-y-3" noValidate>
          <p className="text-[13px] leading-snug text-stone-700">
            Get a one-time code at the personal email HR has on file for you.
          </p>
          <div>
            <label htmlFor="emergency-email" className="mb-1 block text-[13px] font-semibold text-stone-800">
              Work email
            </label>
            <input
              id="emergency-email"
              type="email"
              autoComplete="username"
              inputMode="email"
              className={input}
              placeholder="you@team-voc.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </div>
          {error ? (
            <p role="alert" className="text-[13px] text-red-800">
              {error}
            </p>
          ) : null}
          <button type="submit" className={buttonClass("secondary", "md", "w-full")} disabled={busy}>
            {busy ? "Sending…" : "Email me a sign-in code"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="mt-2 space-y-3" noValidate>
          <p className="text-[13px] leading-snug text-stone-700">
            If <strong className="font-semibold">{email.trim()}</strong> can use this, a code is on its way to your
            personal email. It lasts 10 minutes. Nothing after a few minutes? HR may not have a personal email for
            you.
          </p>
          <div>
            <label htmlFor="emergency-code" className="mb-1 block text-[13px] font-semibold text-stone-800">
              8-digit code
            </label>
            <input
              id="emergency-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={11}
              className={cx(input, "tracking-[0.2em]")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-invalid={error ? true : undefined}
              autoFocus
            />
          </div>
          {error ? (
            <p role="alert" className="text-[13px] text-red-800">
              {error}
            </p>
          ) : null}
          <button type="submit" className={buttonClass("primary", "md", "w-full")} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="flex flex-wrap justify-between gap-2 text-[13px]">
            <button type="button" className={link} onClick={() => sendCode()} disabled={busy}>
              Send a new code
            </button>
            <button
              type="button"
              className={link}
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              disabled={busy}
            >
              Use a different email
            </button>
          </p>
        </form>
      )}
    </section>
  );
}
