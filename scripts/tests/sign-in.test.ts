/**
 * One sign-in for all TEAM apps: the sign-in time on the session, ending sessions signed out
 * elsewhere, and the limit on automatic sign-ins that stops a sign-in loop. Made-up people only.
 * Run with `npm test`.
 */
import assert from "node:assert/strict";
import { teamSessionSignedOut, teamSignedInAt } from "../../src/team-sign-in-server";
import {
  AUTO_SIGN_IN_WINDOW_MS,
  MAX_AUTO_SIGN_INS,
  nextAutoSignIns,
  recentAutoSignIns,
} from "../../src/ui/TeamSignIn";

const env = { TEAM_INTERNAL_ACCESS_SECRET: "test-secret", NEXT_PUBLIC_HR_URL: "https://hr.example.test" } as unknown as NodeJS.ProcessEnv;
let hrSignedOutAt: number | null = null;
(globalThis as { fetch: unknown }).fetch = async () => ({ ok: true, status: 200, json: async () => ({ signedOutAt: hrSignedOutAt }) });

async function main() {
  // --- Sign-in time: stamped as teamSignedInAt at sign-in. ---
  const restamped: Record<string, unknown> = { teamSignedInAt: 5 };
  assert.equal(teamSignedInAt(restamped, { provider: "azure-ad" }, 1234), 1234, "signing in restamps");
  const now = Date.now();
  const legacy: Record<string, unknown> = { signedInAt: now - 1000 };
  assert.equal(teamSignedInAt(legacy, null), now - 1000, "v1.10.0-3 stamp (ms) is kept");
  assert.equal(legacy.teamSignedInAt, now - 1000);
  assert.equal(teamSignedInAt({ signedInAt: Math.floor(now / 1000) }, null), 0, "seconds count as long ago");
  assert.equal(teamSignedInAt({}, null), 0, "no stamp counts as long ago");

  // --- The 2026-11-13 loop: Voc hotline writes its own signedInAt (seconds) on the same token. ---
  hrSignedOutAt = Date.now() - 60_000; // signed out a minute ago
  const voc: Record<string, unknown> = { email: "pat@team.test" };
  assert.equal(await teamSessionSignedOut(voc, { provider: "azure-ad" }, env), false, "fresh sign-in stays");
  voc.signedInAt = Math.floor(Date.now() / 1000);
  assert.equal(await teamSessionSignedOut(voc, null, env), false, "next request: still signed in");

  // A sign-out after the session started still ends it.
  hrSignedOutAt = Date.now();
  assert.equal(await teamSessionSignedOut({ email: "lee@team.test", teamSignedInAt: hrSignedOutAt - 10_000 }, null, env), true);

  // --- Automatic sign-ins: at most MAX_AUTO_SIGN_INS per window, then stop. ---
  const t = 10_000_000;
  let list: number[] | null = [];
  for (let i = 0; i < MAX_AUTO_SIGN_INS; i++) {
    list = nextAutoSignIns(list, t + i * 1000);
    assert.ok(list, `automatic sign-in ${i + 1} is allowed`);
  }
  assert.equal(list!.length, MAX_AUTO_SIGN_INS);
  assert.equal(nextAutoSignIns(list, t + 5000), null, "the next one is refused: show the button");
  assert.ok(nextAutoSignIns(list, t + AUTO_SIGN_IN_WINDOW_MS + 3000), "allowed again once the window has passed");
  // Times in the future (the clock moved back) don't count.
  assert.deepEqual(recentAutoSignIns([t + 60_000, t + 120_000, t + 3_600_000], t), []);
  assert.ok(nextAutoSignIns([t + 60_000, t + 120_000, t + 3_600_000], t));
  // Junk in sessionStorage is ignored.
  assert.deepEqual(recentAutoSignIns("nope", t), []);
  assert.deepEqual(recentAutoSignIns([null, "1", t - 1000], t), [t - 1000]);

  console.log("sign-in: all checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
