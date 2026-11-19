/**
 * The TEAM Messages chime: two soft rising notes, made with Web Audio (no sound file). Played
 * by Messages itself and by the Messages dot in every app's top menu when a new unread
 * message arrives. Whether it plays is the person's choice in Messages → Notification
 * settings (saved with their account), which also keeps it quiet in their quiet hours.
 *
 * Browsers allow sound only after a click or key press in the page, so nothing plays until
 * then (unlockChime is called on those).
 */

let ctx: AudioContext | null = null;

/** Called on a click, tap or key press: lets later chimes play (the browser's rule). */
export function unlockChime(): void {
  try {
    if (typeof window === "undefined") return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    ctx ??= new Ctx();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
}

/** Whether a chime would be heard now (the browser has allowed sound in this window). */
export function chimeReady(): boolean {
  return ctx?.state === "running";
}

/** Plays the chime, about half a second. Silent if the browser hasn't allowed sound yet. */
export function playChime(): void {
  const a = ctx;
  if (!a || a.state !== "running") return;
  try {
    const start = a.currentTime + 0.01;
    const notes: [number, number][] = [
      [880, 0], // A5
      [1318.5, 0.12], // E6
    ];
    for (const [freq, at] of notes) {
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = start + at;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(gain).connect(a.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    }
  } catch {
    // No sound this time.
  }
}

type Store = Pick<Storage, "getItem" | "setItem">;

const CLAIM_KEY = "team-messages-chimed-through";

/**
 * True for the first window of this app to ask about this message (by its id): with the
 * app open in two tabs, only one chimes.
 */
export function claimChime(messageId: number, store?: Store | null): boolean {
  try {
    const s = store === undefined ? (typeof localStorage === "undefined" ? null : localStorage) : store;
    if (!s) return true;
    if (Number(s.getItem(CLAIM_KEY) ?? 0) >= messageId) return false;
    s.setItem(CLAIM_KEY, String(messageId));
    return true;
  } catch {
    return true;
  }
}

/**
 * Whether the menu's Messages dot should chime for this answer from /api/messages-unread:
 * a newer unread message than the last answer (not the first answer after the page loads),
 * and Messages says the chime is on for this person right now.
 */
export function menuChimeFor(previousNewest: number | null, data: { newest?: unknown; chime?: unknown }): number {
  const newest = Number(data.newest);
  if (previousNewest === null || data.chime !== true || !Number.isSafeInteger(newest) || newest <= previousNewest) return 0;
  return newest;
}
