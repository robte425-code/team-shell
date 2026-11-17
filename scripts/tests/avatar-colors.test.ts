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
    });
  assert.deepEqual(await avatarColorsByEmail(), { "ann@example.test": "#1d4ed8" }, "only good colors, by lower-case email");
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

  resetAvatarColorsForTests();
  setAvatarColorsEndpoint("/elsewhere");
  respond = () => ({ ok: false, status: 401, json: async () => ({}) });
  assert.deepEqual(await loadAvatarColors(), {}, "signed out or missing route: circles stay neutral");
  assert.equal(requested.at(-1), "/elsewhere");

  assert.deepEqual(cleanAvatarColors(null), {});
  assert.deepEqual(cleanAvatarColors({ "A@B.C": "#ABCDEF" }), { "a@b.c": "#abcdef" });
}

function avatar() {
  const plain = renderToStaticMarkup(createElement(Avatar, { name: "Ann Example", email: "ann@example.test" }));
  assert.match(plain, />AE</);
  assert.doesNotMatch(plain, /background-color/, "no color known while rendering on the server");
  const colored = renderToStaticMarkup(createElement(Avatar, { name: "Ann Example", color: "#1d4ed8" }));
  assert.match(colored, /background-color:#1d4ed8/);
}

async function main() {
  await serverSide();
  await browserSide();
  avatar();
  console.log("avatar-colors: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
