// Runs scripts/tests/*.test.ts: each is bundled with esbuild (the TypeScript sources need no
// separate build) into a temporary file and run with node.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "tests");
const out = mkdtempSync(join(tmpdir(), "team-shell-test-"));
let failed = false;
try {
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".test.ts")).sort()) {
    const outfile = join(out, file.replace(/\.ts$/, ".cjs"));
    await build({ entryPoints: [join(dir, file)], bundle: true, platform: "node", format: "cjs", outfile, logLevel: "warning" });
    try {
      execFileSync(process.execPath, [outfile], { stdio: "inherit" });
    } catch {
      failed = true;
    }
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
if (failed) process.exit(1);
