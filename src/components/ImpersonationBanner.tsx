"use client";

import { useState } from "react";
import { stopImpersonation } from "../impersonate-client";

export function ImpersonationBanner({
  name,
  email,
  apiPath = "/api/impersonate",
  variant = "tailwind",
  onChange,
}: {
  name: string;
  email: string;
  apiPath?: string;
  /** "tailwind" (default) or "plain" (styles/team-shell.css class names). */
  variant?: "tailwind" | "plain";
  /**
   * Called after view-as has ended instead of reloading the page (a failed exit shows an
   * alert). Leave unset to keep the default (reload).
   */
  onChange?: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const plain = variant === "plain";

  async function exit() {
    setBusy(true);
    if (!onChange) {
      await stopImpersonation(apiPath);
      return;
    }
    let err: string | null;
    try {
      err = await stopImpersonation(apiPath, { reload: false });
    } catch {
      err = "Could not exit view-as";
    }
    if (err) {
      window.alert(err);
      setBusy(false);
      return;
    }
    try {
      await onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={
        plain
          ? "team-impersonation-banner"
          : "flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm text-amber-950"
      }
    >
      <span>
        Viewing as <strong>{name}</strong>{" "}
        {email ? (
          <span className={plain ? "team-impersonation-banner-email" : "text-amber-900/80"}>({email})</span>
        ) : null}{" "}
        — you&apos;re seeing exactly what they see in this app.
      </span>
      <button
        type="button"
        onClick={exit}
        disabled={busy}
        className={
          plain
            ? undefined
            : "h-8 rounded-lg border border-amber-400 bg-white px-3 text-[13px] font-semibold text-amber-950 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60"
        }
      >
        {busy ? "Exiting…" : "Exit view-as"}
      </button>
    </div>
  );
}
