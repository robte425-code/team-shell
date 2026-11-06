"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "./basics";
import { AlertIcon, CheckIcon, CloseIcon } from "./icons";
import { Dialog } from "./SidePanel";
import { cx } from "./styles";

type NoticeTone = "success" | "error" | "info";
type Notice = { id: number; message: ReactNode; tone: NoticeTone };
type ShowNotice = (message: ReactNode, tone?: NoticeTone) => void;

const NoticeContext = createContext<ShowNotice | null>(null);

/** Hosts the floating "Saved" notices. Put it once around the app (e.g. in the root layout). */
export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [mounted, setMounted] = useState(false);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    setMounted(true);
    const pending = timers.current;
    return () => pending.forEach((t) => clearTimeout(t));
  }, []);

  const dismiss = useCallback((id: number) => {
    setNotices((list) => list.filter((n) => n.id !== id));
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const show = useCallback<ShowNotice>(
    (message, tone = "success") => {
      const id = nextId.current++;
      setNotices((list) => [...list.slice(-2), { id, message, tone }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), tone === "error" ? 8000 : 3500)
      );
    },
    [dismiss]
  );

  return (
    <NoticeContext.Provider value={show}>
      {children}
      {mounted
        ? createPortal(
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4"
            >
              {notices.map((n) => (
                <div
                  key={n.id}
                  className={cx(
                    "pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg",
                    n.tone === "error" ? "bg-red-700 text-white" : "bg-stone-900 text-white"
                  )}
                >
                  {n.tone === "error" ? (
                    <AlertIcon size={16} className="shrink-0" />
                  ) : n.tone === "success" ? (
                    <CheckIcon size={16} className="shrink-0 text-green-300" />
                  ) : null}
                  <span className="min-w-0 flex-1">{n.message}</span>
                  <button
                    type="button"
                    onClick={() => dismiss(n.id)}
                    aria-label="Dismiss"
                    className="-mr-1 grid h-6 w-6 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <CloseIcon size={14} />
                  </button>
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </NoticeContext.Provider>
  );
}

/** `const notify = useNotice(); notify("Saved")` — or notify("Could not save", "error"). */
export function useNotice(): ShowNotice {
  const show = useContext(NoticeContext);
  return show ?? fallbackNotice;
}

function fallbackNotice(message: ReactNode, tone?: NoticeTone) {
  // Without a NoticeProvider, errors still reach the person.
  if (tone === "error" && typeof message === "string") window.alert(message);
}

type ConfirmOptions = {
  title: ReactNode;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

/**
 * A confirmation dialog in the shared style, in place of window.confirm():
 *
 *   const [confirm, confirmDialog] = useConfirm();
 *   if (await confirm({ title: "Delete this update?", confirmLabel: "Delete", danger: true })) …
 *   return <>{…}{confirmDialog}</>;
 */
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
      }),
    []
  );

  function finish(ok: boolean) {
    pending?.resolve(ok);
    setPending(null);
  }

  const dialog = (
    <Dialog
      open={pending !== null}
      onClose={() => finish(false)}
      title={pending?.title ?? ""}
      description={pending?.message}
      size="sm"
      role="alertdialog"
      initialFocusRef={pending?.danger ? undefined : confirmRef}
      footer={
        <>
          <Button onClick={() => finish(false)}>{pending?.cancelLabel ?? "Cancel"}</Button>
          <Button
            ref={confirmRef}
            variant={pending?.danger ? "dangerSolid" : "primary"}
            onClick={() => finish(true)}
          >
            {pending?.confirmLabel ?? "OK"}
          </Button>
        </>
      }
    />
  );

  return [confirm, dialog];
}
