/**
 * The shared TEAM look, as Tailwind classes. The palette is Tailwind's own scales:
 * stone for text, borders and surfaces (stone-900 is the near-black main button),
 * blue-700 for links, blue-600 for focus, and green / amber / red / blue for status.
 *
 * Every class is written out in full so the apps' Tailwind content scan (which includes
 * this package's src/) finds it.
 */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Content width that lines up under the TEAM header in every app. */
export const pageContainer = "mx-auto w-full max-w-[1200px] px-4 sm:px-6";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

export type ButtonVariant = "primary" | "secondary" | "danger" | "dangerSolid" | "ghost";
export type ButtonSize = "sm" | "md";

const buttonBase =
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap border font-semibold transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: "border-stone-900 bg-stone-900 text-white hover:border-stone-800 hover:bg-stone-800",
  secondary: "border-stone-300 bg-white text-stone-900 hover:bg-stone-50",
  danger: "border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50",
  dangerSolid: "border-red-700 bg-red-700 text-white hover:border-red-800 hover:bg-red-800",
  ghost: "border-transparent bg-transparent text-stone-700 hover:bg-stone-100 hover:text-stone-900",
};

export const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-[13px]",
  md: "h-10 gap-2 rounded-[9px] px-3.5 text-sm",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", extra?: string) {
  return cx(buttonBase, buttonVariants[variant], buttonSizes[size], extra);
}

/** A square icon-only button (the "⋯" menu, close buttons). */
export const iconButton =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors " +
  "hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600";

export const link =
  "font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-sm";

const fieldBase =
  "w-full rounded-[9px] border border-stone-300 bg-white text-[15px] text-stone-900 shadow-sm shadow-stone-900/[0.02] " +
  "placeholder:text-stone-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 " +
  "disabled:bg-stone-50 disabled:text-stone-500 aria-[invalid=true]:border-red-500";

export const input = cx(fieldBase, "h-10 px-3");
export const select = cx(fieldBase, "h-10 pl-3 pr-8");
export const textarea = cx(fieldBase, "min-h-[96px] px-3 py-2 leading-relaxed");

export const label = "block text-sm font-semibold text-stone-800";
export const hint = "text-[13px] text-stone-500";
export const errorText = "text-[13px] font-medium text-red-700";

export const card = "rounded-[14px] border border-stone-200 bg-white";
export const cardHeader = "flex items-center gap-3 border-b border-stone-100 px-5 py-3.5";
export const cardTitle = "text-base font-semibold text-stone-900";

export type Tone = "green" | "amber" | "red" | "blue" | "neutral";

export const chipTones: Record<Tone, string> = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  blue: "bg-blue-100 text-blue-800",
  neutral: "bg-stone-100 text-stone-700",
};

export const chip = "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold";

/** Tables: wrap the <table> in `table.wrap` so a wide table scrolls inside its card. */
export const table = {
  wrap: "relative overflow-x-auto rounded-[14px] border border-stone-200 bg-white",
  table: "w-full border-collapse text-left text-sm",
  th: "whitespace-nowrap border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-stone-500",
  td: "border-b border-stone-100 px-4 py-3 align-middle text-stone-800",
  row: "transition-colors hover:bg-stone-50/70",
};

/** Menus (Admin, account, "⋯"). */
export const menu = {
  panel:
    "rounded-xl border border-stone-200 bg-white p-1.5 text-stone-900 shadow-[0_12px_32px_rgba(28,25,23,0.14)]",
  heading: "px-2.5 pb-1 pt-2 text-[11.5px] font-bold uppercase tracking-[0.06em] text-stone-500",
  item:
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-stone-800 transition-colors " +
    "hover:bg-stone-100 hover:text-stone-900 focus:bg-stone-100 focus:outline-none disabled:opacity-60",
  itemCurrent: "bg-stone-100 font-semibold text-stone-900",
  itemDanger: "text-red-700 hover:bg-red-50 hover:text-red-800 focus:bg-red-50",
  separator: "mx-1 my-1.5 h-px bg-stone-100",
};
