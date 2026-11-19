// The Messages chime in every app's menu: when it plays, once per message, and only when
// Messages says it's on. Made-up people only.
import assert from "node:assert/strict";
import { createElement } from "react";
import { claimChime, menuChimeFor } from "../../src/chime";
import { fetchMessagesUnreadForEmail } from "../../src/messages-unread-server";
import { MESSAGES_NAV_KEY } from "../../src/nav-config";

// When the dot chimes.
assert.equal(menuChimeFor(null, { newest: 9, chime: true }), 0, "not on the first answer after loading");
assert.equal(menuChimeFor(5, { newest: 9, chime: true }), 9);
assert.equal(menuChimeFor(0, { newest: 3, chime: true }), 3, "the first unread message after none");
assert.equal(menuChimeFor(9, { newest: 9, chime: true }), 0, "nothing new");
assert.equal(menuChimeFor(9, { newest: 4, chime: true }), 0, "read since: older");
assert.equal(menuChimeFor(5, { newest: 9, chime: false }), 0, "turned off, or quiet hours");
assert.equal(menuChimeFor(5, { newest: 9 }), 0, "an app (or Messages version) that doesn't say");
assert.equal(menuChimeFor(5, { newest: "x", chime: true }), 0);

// Once per message across this app's windows.
const store = new Map<string, string>();
const fake = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
assert.equal(claimChime(9, fake), true);
assert.equal(claimChime(9, fake), false);
assert.equal(claimChime(10, fake), true);
assert.equal(claimChime(3, null), true, "no storage: it plays");

async function server() {
  const env = { TEAM_INTERNAL_ACCESS_SECRET: "s", NEXT_PUBLIC_MESSAGES_URL: "https://messages.example.test" } as NodeJS.ProcessEnv;
  const answer = (body: unknown) => (globalThis as { fetch: unknown }).fetch = async () => new Response(JSON.stringify(body), { status: 200 });
  answer({ unread: 3, newest: 41, chime: true });
  assert.deepEqual(await fetchMessagesUnreadForEmail("Ann@Example.test", env), { unread: 3, newest: 41, chime: true });
  answer({ unread: 2 });
  assert.deepEqual(await fetchMessagesUnreadForEmail("ann@example.test", env), { unread: 2, newest: 0, chime: false }, "an older Messages: no chime");
  answer({ unread: 2, newest: -1, chime: "yes" });
  assert.deepEqual(await fetchMessagesUnreadForEmail("ann@example.test", env), { unread: 2, newest: 0, chime: false });
  assert.deepEqual(await fetchMessagesUnreadForEmail("ann@example.test", {} as NodeJS.ProcessEnv), { unread: 0, newest: 0, chime: false });
}

/** In a browser: the menu chimes for a new unread message, once, after a click; never while viewing as someone. */
async function inTheBrowser() {
  const { JSDOM } = require("jsdom") as typeof import("jsdom");
  const dom = new JSDOM("<!doctype html><div id=root></div>", { url: "https://app.example.test/", pretendToBeVisual: true });
  const g = globalThis as Record<string, unknown>;
  for (const k of ["window", "document", "HTMLElement", "Node", "localStorage"]) g[k] = (dom.window as unknown as Record<string, unknown>)[k];
  g.IS_REACT_ACT_ENVIRONMENT = true;
  let notes = 0;
  class FakeAudio {
    state = "suspended";
    currentTime = 0;
    destination = {};
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
    createOscillator() {
      return { type: "", frequency: { value: 0 }, connect: (x: unknown) => x, start: () => void notes++, stop: () => {} };
    }
    createGain() {
      return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: (x: unknown) => x };
    }
  }
  (dom.window as unknown as { AudioContext: unknown }).AudioContext = FakeAudio;

  let answer: unknown = { unread: 1, newest: 10, chime: true };
  (globalThis as { fetch: unknown }).fetch = async () => new Response(JSON.stringify(answer), { status: 200 });
  const stuck = setTimeout(() => {
    console.error("chime: the browser check didn't finish");
    process.exit(1);
  }, 20_000);
  stuck.unref();

  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { UserNav } = await import("../../src/components/UserNav");
  const links = [{ kind: "external", href: "https://messages.example.test/", label: "Messages", navKey: MESSAGES_NAV_KEY }];
  const tick = () => new Promise((r) => setTimeout(r, 20));
  const poll = async () => {
    await act(async () => {
      dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));
      await tick();
    });
  };
  const root = createRoot(dom.window.document.getElementById("root")!);
  const render = async (chime: boolean, key: string) => {
    await act(async () => {
      root.render(createElement(UserNav, { links: links as never, pathname: "/", LinkComponent: "a", chime, refreshKey: key }));
      await tick();
    });
  };
  // Turned off in Messages: a click starts no sound system at all.
  answer = { unread: 1, newest: 10, chime: false };
  let made = 0;
  (dom.window as unknown as { AudioContext: unknown }).AudioContext = class extends FakeAudio {
    constructor() {
      super();
      made++;
    }
  };
  await render(true, "off");
  dom.window.dispatchEvent(new dom.window.Event("pointerdown"));
  await tick();
  assert.equal(made, 0, "chime off: no audio started on a click");
  answer = { unread: 1, newest: 10, chime: true };
  await render(true, "a");
  assert.equal(notes, 0, "nothing on load");
  answer = { unread: 2, newest: 11, chime: true };
  await poll();
  assert.equal(notes, 0, "no sound before a click (the browser's rule)");
  dom.window.dispatchEvent(new dom.window.Event("pointerdown"));
  await tick();
  answer = { unread: 3, newest: 12, chime: true };
  await poll();
  assert.equal(notes, 2, "a new message: the chime's two notes");
  await poll();
  assert.equal(notes, 2, "the same message doesn't chime again");
  answer = { unread: 4, newest: 13, chime: false };
  await poll();
  assert.equal(notes, 2, "turned off in Messages (or quiet hours)");
  await render(false, "b");
  answer = { unread: 5, newest: 14, chime: true };
  await poll();
  answer = { unread: 6, newest: 15, chime: true };
  await poll();
  assert.equal(notes, 2, "viewing as someone: no chime");
  await act(async () => root.unmount());
}

(async () => {
  await server();
  await inTheBrowser();
  console.log("chime: ok");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
