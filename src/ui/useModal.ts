"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

export function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("hidden") && el.getClientRects().length > 0
  );
}

/** Open panels, innermost last: only the innermost one handles Escape and Tab. */
const modalStack: object[] = [];
let bodyOverflowBefore = "";

/**
 * Shared behaviour for side panels and dialogs while `open`:
 * Escape asks to close, Tab stays inside `containerRef`, the page behind doesn't scroll,
 * focus moves in on open (to `initialFocusRef`, else the first field or button) and goes
 * back to whatever had it on close.
 */
export function useModal(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  requestClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>
) {
  const closeRef = useRef(requestClose);
  closeRef.current = requestClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    const focusFirst = () => {
      if (!container) return;
      const target =
        initialFocusRef?.current ||
        container.querySelector<HTMLElement>("[data-autofocus]") ||
        focusableIn(container).find((el) => !el.hasAttribute("data-modal-close")) ||
        container;
      target.focus({ preventScroll: true });
    };
    const frame = requestAnimationFrame(focusFirst);

    const token = {};
    const { body } = document;
    if (modalStack.length === 0) bodyOverflowBefore = body.style.overflow;
    modalStack.push(token);
    body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (!container || modalStack[modalStack.length - 1] !== token) return;
      if (e.key === "Escape") {
        // Leave Escape to an open menu or popover inside the panel.
        if (e.defaultPrevented) return;
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusableIn(container);
      if (items.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (!container.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (active === first || active === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      modalStack.splice(modalStack.indexOf(token), 1);
      if (modalStack.length === 0) body.style.overflow = bodyOverflowBefore;
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
    // initialFocusRef is read once, when the panel opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, containerRef]);
}
