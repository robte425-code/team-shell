// The Messages admin menu: All messages and Settings, each highlighted only on its own page.
import assert from "node:assert/strict";
import { messagesAdminSections } from "../../src/nav-config";

const [messages] = messagesAdminSections("/admin", {}, { includeAppAdmin: true });
assert.equal(messages.label, "Messages");
assert.deepEqual(
  messages.items.map((i) => [i.href, i.label]),
  [
    ["/admin", "All messages"],
    ["/admin/settings", "Settings"],
  ]
);
const active = (p: string) => messages.items.filter((i) => i.isActive?.(p)).map((i) => i.label);
assert.deepEqual(active("/admin"), ["All messages"]);
assert.deepEqual(active("/admin/settings"), ["Settings"]);
assert.deepEqual(active("/"), []);
assert.deepEqual(messagesAdminSections("/admin", {}, { includeAppAdmin: false }), []);
console.log("messages admin nav: ok");
