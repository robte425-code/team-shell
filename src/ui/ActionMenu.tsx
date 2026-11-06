"use client";

import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { MoreIcon } from "./icons";
import { cx, iconButton, menu } from "./styles";

export type ActionMenuItem =
  | {
      label: ReactNode;
      onSelect?: () => void;
      href?: string;
      danger?: boolean;
      disabled?: boolean;
      icon?: ReactNode;
    }
  | "separator";

/** Moves focus between the menu items with the arrow keys, Home and End. */
export function moveMenuFocus(e: KeyboardEvent<HTMLElement>, container: HTMLElement | null): boolean {
  if (!container) return false;
  const items = Array.from(
    container.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled]):not([aria-disabled="true"])')
  );
  if (items.length === 0) return false;
  const i = items.indexOf(document.activeElement as HTMLElement);
  let next: HTMLElement | undefined;
  if (e.key === "ArrowDown") next = items[(i + 1) % items.length];
  else if (e.key === "ArrowUp") next = items[(i - 1 + items.length) % items.length];
  else if (e.key === "Home") next = items[0];
  else if (e.key === "End") next = items[items.length - 1];
  if (!next) return false;
  e.preventDefault();
  next.focus();
  return true;
}

/** Closes a menu on a click or tap outside `root` (and any other elements that belong to it). */
export function useDismiss(
  open: boolean,
  root: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  close: () => void
) {
  const closeRef = useRef(close);
  closeRef.current = close;
  const roots = Array.isArray(root) ? root : [root];
  const rootsRef = useRef(roots);
  rootsRef.current = roots;
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const inside = rootsRef.current.some((r) => r.current?.contains(e.target as Node));
      if (!inside) closeRef.current();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);
}

const MENU_WIDTH = 208;
const EDGE = 8;

/** The "⋯" button with a short list of actions for one row or card. */
export function ActionMenu({
  label = "More actions",
  items,
  align = "right",
  className,
  triggerClassName,
}: {
  /** Read out for the button, e.g. "Actions for Monthly meeting". */
  label?: string;
  items: ActionMenuItem[];
  align?: "left" | "right";
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useDismiss(open, [rootRef, menuRef], () => setOpen(false));

  // The menu is drawn over the page (so a scrolling table or card can't cut it off), lined up
  // with the button: below it, or above when there's no room below.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const r = trigger.getBoundingClientRect();
      const height = menuRef.current?.offsetHeight ?? 0;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      let left = align === "right" ? r.right - MENU_WIDTH : r.left;
      left = Math.max(EDGE, Math.min(left, vw - MENU_WIDTH - EDGE));
      let top = r.bottom + 4;
      if (height && top + height > vh - EDGE && r.top - 4 - height >= EDGE) top = r.top - 4 - height;
      setPos({ top, left });
    }
    place();
    const frame = requestAnimationFrame(place);
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (open && pos) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    // Focus once, when the menu first has a position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos !== null]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      e.preventDefault();
      close();
    } else {
      moveMenuFocus(e, menuRef.current);
    }
  }

  return (
    <div ref={rootRef} className={cx("relative inline-block self-start", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cx(iconButton, open && "bg-stone-100 text-stone-900", triggerClassName)}
      >
        <MoreIcon size={18} />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKeyDown}
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, width: MENU_WIDTH, visibility: pos ? "visible" : "hidden" }}
            className={cx(menu.panel, "fixed z-[70]")}
          >
            {items.map((item, i) => {
              if (item === "separator") return <div key={`sep-${i}`} role="separator" className={menu.separator} />;
              const cls = cx(menu.item, item.danger && menu.itemDanger);
              const content = (
                <>
                  {item.icon ? <span className="shrink-0 text-current opacity-80">{item.icon}</span> : null}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </>
              );
              return (
                <Fragment key={i}>
                  {item.href && !item.disabled ? (
                    <a role="menuitem" href={item.href} className={cls} onClick={() => setOpen(false)}>
                      {content}
                    </a>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      className={cls}
                      onClick={() => {
                        // Focus goes back to "⋯" first, so a panel this opens returns it there.
                        close();
                        item.onSelect?.();
                      }}
                    >
                      {content}
                    </button>
                  )}
                </Fragment>
              );
            })}
          </div>,
          document.body
        )
        : null}
    </div>
  );
}
