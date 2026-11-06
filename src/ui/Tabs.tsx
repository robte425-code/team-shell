"use client";

import { useRef, type ElementType, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./styles";

export type TabItem<T extends string> = { value: T; label: ReactNode; count?: number };

const tabClass = (selected: boolean) =>
  cx(
    "relative -mb-px inline-flex h-10 items-center gap-2 whitespace-nowrap border-b-2 px-1 text-sm font-semibold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded-t-sm",
    selected ? "border-stone-900 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800"
  );

function Count({ n, selected }: { n?: number; selected: boolean }) {
  if (n === undefined) return null;
  return (
    <span
      className={cx(
        "rounded-full px-1.5 py-px text-xs font-semibold tabular-nums",
        selected ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"
      )}
    >
      {n}
    </span>
  );
}

/**
 * Tabs that switch content on the same page. Wrap the content in an element with
 * `{...tabPanelProps(id, value)}` so the two are linked for screen readers.
 */
export function Tabs<T extends string>({
  id,
  items,
  value,
  onChange,
  label,
  className,
}: {
  id: string;
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = items.findIndex((t) => t.value === value);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(items[next]!.value);
    listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx("flex gap-6 overflow-x-auto border-b border-stone-200", className)}
    >
      {items.map((t) => {
        const selected = t.value === value;
        return (
          <button
            key={t.value}
            id={`${id}-tab-${t.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${id}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={tabClass(selected)}
          >
            {t.label}
            <Count n={t.count} selected={selected} />
          </button>
        );
      })}
    </div>
  );
}

export function tabPanelProps(id: string, value: string) {
  return { role: "tabpanel", id: `${id}-panel`, "aria-labelledby": `${id}-tab-${value}`, tabIndex: 0 } as const;
}

/** The same look as Tabs, for links between pages (e.g. Active / Archived). */
export function TabLinks({
  items,
  label,
  LinkComponent = "a",
  className,
}: {
  items: { href: string; label: ReactNode; count?: number; current: boolean }[];
  label: string;
  LinkComponent?: ElementType;
  className?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Link = LinkComponent as any;
  return (
    <nav aria-label={label} className={cx("flex gap-6 overflow-x-auto border-b border-stone-200", className)}>
      {items.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.current ? "page" : undefined} className={tabClass(t.current)}>
          {t.label}
          <Count n={t.count} selected={t.current} />
        </Link>
      ))}
    </nav>
  );
}
