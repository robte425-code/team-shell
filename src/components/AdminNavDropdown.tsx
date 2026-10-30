"use client";

import { Fragment, useEffect, useRef, useState, type ElementType } from "react";
import type { AdminNavSection } from "../nav-config";

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
    "flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm transition-colors hover:bg-stone-50",
  label: "max-w-[10rem] truncate sm:max-w-none",
  menu: "absolute left-0 top-full z-30 mt-1 min-w-[12rem] rounded-lg border border-stone-200 bg-white py-1 shadow-lg",
  sectionDivider: "mt-1 border-t border-stone-100",
  heading: "border-b border-stone-100 px-3 py-2 last:border-b-0",
  headingText: "text-xs font-semibold uppercase tracking-wide text-stone-500",
  item: "block px-3 py-2 text-sm font-medium",
  itemCurrent: "bg-stone-100 text-stone-900",
  itemIdle: "text-stone-600 hover:bg-stone-50 hover:text-stone-900",
  separator: "my-1 border-t border-stone-200",
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
}: {
  sections: AdminNavSection[];
  pathname: string;
  LinkComponent: ElementType<any>;
  /** "tailwind" (default) or "plain" (styles/team-shell.css class names). */
  variant?: "tailwind" | "plain";
}) {
  const plain = variant === "plain";
  const c = plain ? PLAIN : TAILWIND;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Link = LinkComponent as any;

  return (
    <div className={c.root} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={c.trigger}
      >
        <span className={c.label || undefined}>Admin</span>
        <Chevron open={open} plain={plain} />
      </button>
      {open && (
        <ul role="menu" aria-label="Admin" className={c.menu}>
          {sections.map((section, si) => (
            <li key={section.label} role="presentation">
              {si > 0 && <div className={c.sectionDivider} />}
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
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      role="menuitem"
                      href={item.href}
                      className={className}
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
