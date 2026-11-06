"use client";

import { Fragment, useEffect, useRef, useState, type ElementType, type KeyboardEvent } from "react";
import type { AdminNavSection } from "../nav-config";
import { moveMenuFocus } from "../ui/ActionMenu";

function Chevron({ open, plain }: { open: boolean; plain?: boolean }) {
  return (
    <svg
      className={
        plain ? undefined : `h-4 w-4 shrink-0 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`
      }
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

const TAILWIND = {
  root: "relative shrink-0",
  trigger:
    "flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-50 aria-expanded:border-stone-900 aria-expanded:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
  label: "max-w-[10rem] truncate sm:max-w-none",
  menu: "absolute top-full z-50 mt-2 w-64 rounded-xl border border-stone-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(28,25,23,0.14)]",
  sectionDivider: "mx-1 my-1.5 h-px bg-stone-100",
  heading: "px-2.5 pb-1 pt-2",
  headingText: "text-[11.5px] font-bold uppercase tracking-[0.06em] text-stone-500",
  item: "block rounded-lg px-2.5 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
  itemCurrent: "bg-stone-100 font-semibold text-stone-900",
  itemIdle: "text-stone-800 hover:bg-stone-100 hover:text-stone-900 focus:bg-stone-100",
  separator: "mx-1 my-1.5 h-px bg-stone-100",
};

/** Class names from styles/team-shell.css, for static pages without Tailwind. */
const PLAIN: typeof TAILWIND = {
  root: "team-admin-nav",
  trigger: "team-admin-nav-trigger",
  label: "",
  menu: "team-admin-nav-menu",
  sectionDivider: "team-admin-nav-separator",
  heading: "team-admin-nav-menu-heading",
  headingText: "",
  item: "team-admin-nav-item",
  itemCurrent: "is-current",
  itemIdle: "",
  separator: "team-admin-nav-separator",
};

export function AdminNavDropdown({
  sections,
  pathname,
  LinkComponent,
  variant = "tailwind",
  align = "left",
}: {
  sections: AdminNavSection[];
  pathname: string;
  LinkComponent: ElementType<any>;
  /** "tailwind" (default) or "plain" (styles/team-shell.css class names). */
  variant?: "tailwind" | "plain";
  /** Which edge of the button the menu lines up with. */
  align?: "left" | "right";
}) {
  const plain = variant === "plain";
  const c = plain ? PLAIN : TAILWIND;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function onMenuKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    } else {
      moveMenuFocus(e, menuRef.current);
    }
  }

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || (e.key === "Escape" && open)) {
      e.preventDefault();
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      setOpen(true);
      requestAnimationFrame(() =>
        menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Link = LinkComponent as any;

  return (
    <div className={c.root} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        aria-expanded={open}
        aria-haspopup="menu"
        className={c.trigger}
      >
        <span className={c.label || undefined}>Admin</span>
        <Chevron open={open} plain={plain} />
      </button>
      {open && (
        <ul
          ref={menuRef}
          role="menu"
          aria-label="Admin"
          onKeyDown={onMenuKeyDown}
          className={plain ? c.menu : `${c.menu} ${align === "right" ? "right-0" : "left-0"}`}
          data-align={plain ? align : undefined}
        >
          {sections.map((section, si) => (
            <li key={section.label} role="presentation">
              {si > 0 && <div role="separator" className={c.sectionDivider} />}
              <div className={c.heading}>
                <span className={c.headingText || undefined}>{section.label}</span>
              </div>
              {section.items.map((item) => {
                const isCurrent = item.isActive?.(pathname) ?? false;
                const stateClass = isCurrent ? c.itemCurrent : c.itemIdle;
                const className = stateClass ? `${c.item} ${stateClass}` : c.item;
                const itemKey = `${item.href}-${item.label}`;
                const menuItem =
                  item.external ? (
                    <a
                      role="menuitem"
                      href={item.href}
                      className={className}
                      aria-current={isCurrent ? "page" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      role="menuitem"
                      href={item.href}
                      className={className}
                      aria-current={isCurrent ? "page" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                return (
                  <Fragment key={itemKey}>
                    {item.separatorBefore ? (
                      <div role="separator" className={c.separator} />
                    ) : null}
                    {menuItem}
                  </Fragment>
                );
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
