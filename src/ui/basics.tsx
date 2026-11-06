"use client";

import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { InboxIcon, SearchIcon } from "./icons";
import {
  buttonClass,
  card,
  chip,
  chipTones,
  cx,
  errorText,
  hint,
  input,
  label as labelClass,
  type ButtonSize,
  type ButtonVariant,
  type Tone,
} from "./styles";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode }
>(function Button({ variant = "secondary", size = "md", icon, className, children, type = "button", ...rest }, ref) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
});

export function Chip({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={cx(chip, chipTones[tone], className)}>{children}</span>;
}

export function initialsFor(name?: string | null, email?: string | null): string {
  const words = String(name || "")
    .replace(/\(.*?\)/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w));
  if (words.length >= 2) return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  const local = String(email || "").split("@")[0] || "";
  return local ? local.slice(0, 2).toUpperCase() : "?";
}

const AVATAR_SIZES = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-8 w-8 text-xs",
  lg: "h-9 w-9 text-[13px]",
};

export function Avatar({
  name,
  email,
  size = "md",
  className,
}: {
  name?: string | null;
  email?: string | null;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cx(
        "inline-grid shrink-0 place-items-center rounded-full bg-stone-900 font-semibold text-white",
        AVATAR_SIZES[size],
        className
      )}
    >
      {initialsFor(name, email)}
    </span>
  );
}

/** Page title row: title and description on the left, action buttons on the right. */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-sm font-semibold text-stone-500">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold leading-tight tracking-[-0.02em] text-stone-900 sm:text-[28px]">{title}</h1>
        {description ? <div className="mt-1.5 text-[15px] text-stone-600">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const TILE_ACCENTS: Record<Tone, string> = {
  green: "bg-green-600",
  amber: "bg-amber-500",
  red: "bg-red-600",
  blue: "bg-blue-600",
  neutral: "bg-stone-400",
};

/** Summary tiles in a row (two per row on phones). */
export function StatTiles({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>{children}</div>;
}

/** One summary number. With onClick it becomes a filter button (`active` shows it's on). */
export function StatTile({
  label,
  value,
  detail,
  tone = "neutral",
  active,
  onClick,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
  active?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-[13px] font-semibold text-stone-600">
        <span aria-hidden className={cx("h-2 w-2 rounded-full", TILE_ACCENTS[tone])} />
        {label}
      </span>
      <span className="mt-1.5 block text-[28px] font-bold leading-none tracking-[-0.02em] text-stone-900 tabular-nums">
        {value}
      </span>
      {detail ? <span className="mt-1.5 block text-[13px] text-stone-500">{detail}</span> : null}
    </>
  );
  const base = "block w-full rounded-[14px] border bg-white px-4 py-3.5 text-left";
  if (!onClick) return <div className={cx(base, "border-stone-200")}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={Boolean(active)}
      className={cx(
        base,
        "transition-colors hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
        active ? "border-stone-900 ring-1 ring-stone-900" : "border-stone-200"
      )}
    >
      {body}
    </button>
  );
}

/** A search box with a magnifier icon; `label` is read out but not shown. */
export function SearchInput({
  label,
  className,
  inputClassName,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; inputClassName?: string }) {
  return (
    <label className={cx("relative block", className)}>
      <span className="sr-only">{label}</span>
      <SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
      <input type="search" placeholder={label} className={cx(input, "pl-9", inputClassName)} {...rest} />
    </label>
  );
}

/** A row of filters above a list or table. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("flex flex-wrap items-center gap-2.5", className)}>{children}</div>;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col items-center px-6 py-10 text-center", className)}>
      <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-stone-100 text-stone-500">
        {icon ?? <InboxIcon size={20} />}
      </span>
      <p className="text-[15px] font-semibold text-stone-900">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** A white card, optionally with a title row (title on the left, actions on the right). */
export function Card({
  title,
  actions,
  children,
  className,
  bodyClassName,
  as: As = "section",
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "div";
}) {
  const titleId = useId();
  return (
    <As className={cx(card, className)} aria-labelledby={title && As === "section" ? titleId : undefined}>
      {title || actions ? (
        <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-3.5">
          {title ? (
            <h2 id={titleId} className="min-w-0 flex-1 text-base font-semibold text-stone-900">
              {title}
            </h2>
          ) : (
            <div className="flex-1" />
          )}
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </As>
  );
}

/**
 * A labelled form field. Pass one input element as the child: it gets the id, and the
 * hint and error are linked to it with aria-describedby.
 */
export function Field({
  label,
  hint: hintText,
  error,
  required,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactElement;
}) {
  const id = useId();
  const hintId = hintText ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cx("space-y-1.5", className)}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? (
          <span className="text-red-700" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hintText ? (
        <p id={hintId} className={hint}>
          {hintText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={errorText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** An on/off switch. `label` is the visible text next to it. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cx("flex items-start gap-3", className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60",
          checked ? "bg-stone-900" : "bg-stone-300"
        )}
      >
        <span
          aria-hidden
          className={cx(
            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </button>
      <span className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-sm font-semibold text-stone-800">
          {label}
        </label>
        {description ? (
          <span id={`${id}-desc`} className="block text-[13px] text-stone-500">
            {description}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** A short notice inside a page or panel (not the floating "Saved" toast). */
export function InlineNotice({
  tone = "neutral",
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const tones: Record<Tone, string> = {
    green: "border-green-200 bg-green-50 text-green-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    neutral: "border-stone-200 bg-stone-50 text-stone-800",
  };
  return (
    <div
      role={tone === "red" ? "alert" : undefined}
      className={cx("flex flex-wrap items-start gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-sm", tones[tone], className)}
    >
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? "mt-0.5" : undefined}>{children}</div> : null}
      </div>
      {action}
    </div>
  );
}
