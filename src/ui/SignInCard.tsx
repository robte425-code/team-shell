import type { ReactNode } from "react";
import { AlertIcon } from "./icons";

/**
 * The shared sign-in page: the TEAM logo, a title, and the app's sign-in button(s) as
 * children. Fills the screen and centres the card.
 */
export function SignInCard({
  title = "Sign in",
  description,
  error,
  children,
  footer,
  logoSrc = "/team-logo.png",
  logoAlt = "Team Vocational Services",
}: {
  title?: ReactNode;
  description?: ReactNode;
  /** Shown above the button, e.g. "Your account doesn't have access to this app." */
  error?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  logoSrc?: string;
  logoAlt?: string;
}) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt={logoAlt} width={460} height={190} className="mx-auto h-16 w-auto" />
          <h1 className="mt-7 text-center text-xl font-bold tracking-[-0.01em] text-stone-900">{title}</h1>
          {description ? <p className="mt-1.5 text-center text-[15px] text-stone-600">{description}</p> : null}
          {error ? (
            <div role="alert" className="mt-5 flex gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-900">
              <AlertIcon size={16} className="mt-0.5 shrink-0 text-red-700" />
              <div className="min-w-0">{error}</div>
            </div>
          ) : null}
          <div className="mt-6 space-y-3">{children}</div>
        </div>
        {footer ? <div className="mt-5 text-center text-[13px] text-stone-500">{footer}</div> : null}
      </div>
    </main>
  );
}
