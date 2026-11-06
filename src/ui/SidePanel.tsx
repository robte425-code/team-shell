"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";
import { cx, iconButton } from "./styles";
import { useModal } from "./useModal";

const PANEL_SIZES = {
  md: "sm:max-w-[480px]",
  lg: "sm:max-w-[640px]",
};

const DIALOG_SIZES = {
  sm: "max-w-[420px]",
  md: "max-w-[560px]",
  lg: "max-w-[720px]",
};

function useEnterTransition(open: boolean) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);
  return { mounted, shown };
}

type OverlayProps = {
  open: boolean;
  /** Called on Escape, the close button and a click outside (after confirmClose allows it). */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons along the bottom (right-aligned). */
  footer?: ReactNode;
  /** Field to focus on open (default: the first field or button, or a `data-autofocus` element). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Return false to keep it open, e.g. after asking about unsaved changes. */
  confirmClose?: () => boolean;
  /** Wraps the body and footer in a <form>, so a submit button in the footer submits it. */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
};

function Body({
  onSubmit,
  children,
  footer,
  bodyClass,
  footerClass,
}: Pick<OverlayProps, "onSubmit" | "children" | "footer"> & { bodyClass: string; footerClass: string }) {
  const inner = (
    <>
      <div className={bodyClass}>{children}</div>
      {footer ? <div className={footerClass}>{footer}</div> : null}
    </>
  );
  return onSubmit ? (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
      {inner}
    </form>
  ) : (
    inner
  );
}

/** A panel that slides in from the right, for creating and editing one thing at a time. */
export function SidePanel({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  initialFocusRef,
  confirmClose,
  onSubmit,
  size = "md",
}: OverlayProps & { size?: keyof typeof PANEL_SIZES }) {
  const { mounted, shown } = useEnterTransition(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const requestClose = () => {
    if (confirmClose && !confirmClose()) return;
    onClose();
  };
  // The portal renders once mounted, so wait for that before trapping focus.
  useModal(open && mounted, panelRef, requestClose, initialFocusRef);

  if (!mounted || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div
        aria-hidden
        onClick={requestClose}
        className={cx(
          "absolute inset-0 bg-stone-900/30 transition-opacity duration-200 motion-reduce:transition-none",
          shown ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cx(
          "absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl outline-none",
          "transition-transform duration-200 ease-out motion-reduce:transition-none",
          PANEL_SIZES[size],
          shown ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-start gap-3 border-b border-stone-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold leading-snug text-stone-900">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-0.5 text-sm text-stone-500">
                {description}
              </p>
            ) : null}
          </div>
          <button type="button" data-modal-close onClick={requestClose} className={cx(iconButton, "-mr-2")} aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>
        <Body
          onSubmit={onSubmit}
          footer={footer}
          bodyClass="min-h-0 flex-1 overflow-y-auto px-5 py-5"
          footerClass="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-3.5"
        >
          {children}
        </Body>
      </div>
    </div>,
    document.body
  );
}

/** A centred dialog: messages, confirmations and short forms. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  initialFocusRef,
  confirmClose,
  onSubmit,
  size = "md",
  role = "dialog",
}: OverlayProps & { size?: keyof typeof DIALOG_SIZES; role?: "dialog" | "alertdialog" }) {
  const { mounted, shown } = useEnterTransition(open);
  const boxRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const requestClose = () => {
    if (confirmClose && !confirmClose()) return;
    onClose();
  };
  useModal(open && mounted, boxRef, requestClose, initialFocusRef);

  if (!mounted || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        aria-hidden
        onClick={role === "alertdialog" ? undefined : requestClose}
        className={cx(
          "absolute inset-0 bg-stone-900/40 transition-opacity duration-200 motion-reduce:transition-none",
          shown ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        ref={boxRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cx(
          "relative flex max-h-[90dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl outline-none sm:rounded-2xl",
          "transition duration-200 ease-out motion-reduce:transition-none",
          DIALOG_SIZES[size],
          shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        )}
      >
        <div className="flex items-start gap-3 px-6 pb-2 pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold leading-snug text-stone-900">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm text-stone-600">
                {description}
              </p>
            ) : null}
          </div>
          {role === "dialog" ? (
            <button type="button" data-modal-close onClick={requestClose} className={cx(iconButton, "-mr-2 -mt-1")} aria-label="Close">
              <CloseIcon size={18} />
            </button>
          ) : null}
        </div>
        <Body
          onSubmit={onSubmit}
          footer={footer}
          bodyClass="min-h-0 flex-1 overflow-y-auto px-6 py-3"
          footerClass="flex flex-wrap items-center justify-end gap-2 px-6 pb-5 pt-3"
        >
          {children}
        </Body>
      </div>
    </div>,
    document.body
  );
}
