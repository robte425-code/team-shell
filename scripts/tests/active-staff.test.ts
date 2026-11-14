/**
 * Signing in with an address outside the TEAM domains: allowed only while HR lists it as an
 * active person's work email. Made-up people only. Run with `npm test`.
 */
import assert from "node:assert/strict";
import { isActiveStaffEmail } from "../../src/active-staff";

process.env.TEAM_INTERNAL_ACCESS_SECRET = "test-secret";
process.env.NEXT_PUBLIC_HR_URL = "https://hr.example.test";

let calls = 0;
(globalThis as { fetch: unknown }).fetch = async () => {
  calls += 1;
  return { ok: true, status: 200, json: async () => ({ users: [{ email: " Pat.Guest@Example.TEST " }, { email: "sam@team.test" }] }) };
};

async function main() {
  assert.equal(await isActiveStaffEmail("pat.guest@example.test"), true, "HR lists the guest's address");
  assert.equal(await isActiveStaffEmail("  PAT.GUEST@example.test "), true, "case and spaces don't matter");
  assert.equal(await isActiveStaffEmail("lee@example.test"), false, "not on HR's list");
  assert.equal(await isActiveStaffEmail(null), false);
  assert.equal(await isActiveStaffEmail("not-an-address"), false);
  assert.equal(await isActiveStaffEmail("a@b@example.test"), false, "two @ never matches");
  assert.equal(calls, 1, "HR is asked once a minute, not per check");
  console.log("active-staff: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
