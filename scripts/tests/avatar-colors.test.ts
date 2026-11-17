/**
 * Circle colors chosen in HR: the server helper reads them from HR's active-staff list, the
 * browser side loads them once per page, and Avatar paints them. Made-up people only.
 * Run with `npm test`.
 */
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { avatarColorsByEmail, isActiveStaffEmail } from "../../src/active-staff";
import {
  AVATAR_COLORS_PATH,
  avatarColorFor,
  cleanAvatarColors,
  loadAvatarColors,
  loadAvatarColorsData,
  resetAvatarColorsForTests,
  setAvatarColor,
  setAvatarColorsEndpoint,
} from "../../src/avatar-colors";
import { Avatar } from "../../src/ui/basics";

process.env.TEAM_INTERNAL_ACCESS_SECRET = "test-secret";
process.env.NEXT_PUBLIC_HR_URL = "https://hr.example.test";

type FakeResponse = { ok: boolean; status: number; json: () => Promise<unknown> };
let respond: (url: string) => FakeResponse;
const requested: string[] = [];
(globalThis as { fetch: unknown }).fetch = async (url: string) => {
  requested.push(String(url));
  return respond(String(url));
};
const ok = (body: unknown): FakeResponse => ({ ok: true, status: 200, json: async () => body });

async function serverSide() {
  respond = () =>
    ok({
      users: [
        { email: " Ann@Example.TEST ", avatarColor: "#1D4ED8" },
        { email: "bo@example.test", avatarColor: "not-a-color" },
        { email: "cy@example.test" },
        { email: "no-at-sign", avatarColor: "#123456" },
      ],
      colors: { "Di.Leave@example.test": "#0F766E", "x": "#123456", "bo@example.test": "nope" },
    });
  assert.deepEqual(
    await avatarColorsByEmail(),
    { "ann@example.test": "#1d4ed8", "di.leave@example.test": "#0f766e" },
    "only good colors, by lower-case email; people on leave (in colors, not users) too"
  );
  assert.equal(await isActiveStaffEmail("di.leave@example.test"), false, "a color doesn't make someone active staff");
  assert.equal(await isActiveStaffEmail("bo@example.test"), true, "people without a color are still active staff");
  const before = requested.length;
  await avatarColorsByEmail();
  assert.equal(requested.length, before, "the colors share the one-minute cache with the rest");
  const copy = await avatarColorsByEmail();
  copy["ann@example.test"] = "#000000";
  assert.equal((await avatarColorsByEmail())["ann@example.test"], "#1d4ed8", "callers get a copy");
}

async function browserSide() {
  requested.length = 0;
  resetAvatarColorsForTests();
  respond = (url) => {
    assert.equal(url, AVATAR_COLORS_PATH);
    return ok({ colors: { "Ann@example.test": "#1D4ED8", "bo@example.test": "red", "x": "#123456" } });
  };
  assert.equal(avatarColorFor("ann@example.test"), null, "nothing until loaded");
  await Promise.all([loadAvatarColors(), loadAvatarColors(), loadAvatarColors()]);
  assert.equal(requested.length, 1, "one request per page, shared");
  assert.equal(avatarColorFor(" ANN@example.test "), "#1d4ed8");
  assert.equal(avatarColorFor("bo@example.test"), null, "a bad color is ignored");
  await loadAvatarColors();
  assert.equal(requested.length, 1, "loaded once");

  setAvatarColor("ann@example.test", "#0F766E");
  assert.equal(avatarColorFor("ann@example.test"), "#0f766e", "a change in HR shows straight away");
  setAvatarColor("ann@example.test", null);
  assert.equal(avatarColorFor("ann@example.test"), null);

  // A failed load is tried again, but not on every circle.
  let clock = 1_000_000;
  resetAvatarColorsForTests(() => clock);
  setAvatarColorsEndpoint("/elsewhere");
  respond = () => ({ ok: false, status: 401, json: async () => ({}) });
  assert.deepEqual(await loadAvatarColors(), {}, "signed out or missing route: circles stay neutral");
  assert.equal(requested.at(-1), "/elsewhere");
  const failedCalls = requested.length;
  await loadAvatarColors();
  assert.equal(requested.length, failedCalls, "not straight away");
  clock += 31_000;
  respond = () => ok({ colors: { "ann@example.test": "#1d4ed8" }, byId: { "7": "#1d4ed8" } });
  await loadAvatarColors();
  assert.equal(avatarColorFor("ann@example.test"), "#1d4ed8", "tried again after half a minute");
  assert.deepEqual(await loadAvatarColorsData(), { colors: { "ann@example.test": "#1d4ed8" }, byId: { "7": "#1d4ed8" } }, "the whole answer, same request");
  const loadedCalls = requested.length;
  clock += 4 * 60_000;
  await loadAvatarColors();
  assert.equal(requested.length, loadedCalls, "fresh for five minutes");
  clock += 2 * 60_000;
  respond = () => ok({ colors: { "ann@example.test": "#0f766e" } });
  await loadAvatarColors();
  assert.equal(avatarColorFor("ann@example.test"), "#0f766e", "a changed color is picked up later");
  respond = () => ({ ok: false, status: 500, json: async () => ({}) });
  await loadAvatarColors(true);
  assert.equal(avatarColorFor("ann@example.test"), "#0f766e", "a failed refresh keeps the colors it had");

  assert.deepEqual(cleanAvatarColors(null), {});
  assert.deepEqual(cleanAvatarColors({ "A@B.C": "#ABCDEF" }), { "a@b.c": "#abcdef" });
}

function avatar() {
  const plain = renderToStaticMarkup(createElement(Avatar, { name: "Ann Example", email: "ann@example.test" }));
  assert.match(plain, />AE</);
  assert.doesNotMatch(plain, /background-color/, "no color known while rendering on the server");
  const colored = renderToStaticMarkup(createElement(Avatar, { name: "Ann Example", color: "#1d4ed8" }));
  assert.match(colored, /background-color:#1d4ed8/);
  assert.match(colored, /text-white/);
  assert.doesNotMatch(colored, /bg-stone-200/);
  const light = renderToStaticMarkup(
    createElement(Avatar, { name: "Bo Sample", neutralClassName: "bg-stone-200 text-stone-700" }, createElement("i", { id: "dot" }))
  );
  assert.match(light, /bg-stone-200 text-stone-700/, "a spot's own neutral tones");
  assert.match(light, /<i id="dot"><\/i>/, "children go inside");
}

/** In a browser: circles render neutral, then take the color when it arrives, all from one request. */
async function inTheBrowser() {
  // A plain require: jsdom is left out of the test bundle and found in node_modules.
  const { JSDOM } = require("jsdom") as typeof import("jsdom");
  const dom = new JSDOM("<!doctype html><div id=root></div>", { url: "https://app.example.test/" });
  const g = globalThis as Record<string, unknown>;
  for (const k of ["window", "document", "HTMLElement", "Node"]) g[k] = (dom.window as unknown as Record<string, unknown>)[k];
  g.IS_REACT_ACT_ENVIRONMENT = true;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");

  requested.length = 0;
  resetAvatarColorsForTests();
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => (release = r));
  respond = () => ok({ colors: { "ann@example.test": "#0f766e" } });
  (globalThis as { fetch: unknown }).fetch = async (url: string) => {
    requested.push(String(url));
    await gate;
    return respond(String(url));
  };
  const stuck = setTimeout(() => {
    console.error("avatar-colors: the browser check didn't finish");
    process.exit(1);
  }, 20_000);
  stuck.unref();
  const root = createRoot(dom.window.document.getElementById("root")!);
  await act(async () => {
    root.render(
      createElement("div", null,
        createElement(Avatar, { name: "Ann Example", email: "Ann@Example.test" }),
        createElement(Avatar, { name: "Ann Example", email: "ann@example.test", size: "sm" }),
        createElement(Avatar, { name: "Cy Outside", email: "cy@elsewhere.test" })
      )
    );
  });
  const circles = () => [...dom.window.document.querySelectorAll("span[aria-hidden]")] as HTMLElement[];
  assert.equal(circles()[0].style.backgroundColor, "", "neutral until the colors arrive");
  await act(async () => {
    release();
    await gate;
    await loadAvatarColors();
  });
  assert.equal(requested.length, 1, "one request for every circle on the page");
  assert.equal(circles()[0].style.backgroundColor, "rgb(15, 118, 110)");
  assert.equal(circles()[1].style.backgroundColor, "rgb(15, 118, 110)");
  assert.equal(circles()[2].style.backgroundColor, "", "someone without a color stays neutral");
  await act(async () => setAvatarColor("ann@example.test", "#1d4ed8"));
  assert.equal(circles()[0].style.backgroundColor, "rgb(29, 78, 216)", "a change shows at once");
  await act(async () => root.unmount());
  dom.window.close();
  clearTimeout(stuck);
}

async function main() {
  await serverSide();
  await browserSide();
  avatar();
  await inTheBrowser();
  console.log("avatar-colors: ok");
  // React's scheduler keeps a channel open after the browser check; nothing is left to wait for.
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
