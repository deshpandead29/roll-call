// Image policy: stock sample photos belong to the labelled example only.
// The real journey shows the group's own photos, and the Recreate paintings
// as references; nothing decorative.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = new URL("../src/", import.meta.url).pathname;
const files = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(path.join(dir, d.name)) : [path.join(dir, d.name)]));
const source = files(root).filter((f) => /\.(tsx?|css)$/.test(f));
const rel = (f) => path.relative(root, f);

test("only the example reaches the stock sample photos", () => {
  const users = source.filter((f) => fs.readFileSync(f, "utf8").includes("prototype/samples")).map(rel);
  assert.deepEqual(users, ["lib/sample.ts"]);
  const importers = source.filter((f) => /from "@\/lib\/sample"/.test(fs.readFileSync(f, "utf8"))).map(rel);
  assert.deepEqual(importers, ["app/sample/sample-view.tsx"]);
});

test("the signed-in journey doesn't push the example or the photo-look demo", () => {
  // Allowed: the signed-out landing ("See an example"), and the example page itself (link to Try the look).
  const allowed = new Set(["app/page.tsx", "app/sample/page.tsx"]);
  const links = source
    .filter((f) => /href=["{`]\/(sample|try)["`}]/.test(fs.readFileSync(f, "utf8")))
    .map(rel)
    .filter((f) => !allowed.has(f));
  assert.deepEqual(links, []);
  // On the home page, the example link sits in the signed-out branch only.
  const home = fs.readFileSync(path.join(root, "app/page.tsx"), "utf8");
  const signedOut = home.slice(0, home.indexOf("// New here"));
  assert.equal((home.match(/href="\/sample"/g) ?? []).length, 1);
  assert.match(signedOut, /href="\/sample">See an example</);
});

test("no decorative collage", () => {
  assert.equal(fs.existsSync(path.join(root, "components/hero-collage.tsx")), false);
  assert.doesNotMatch(fs.readFileSync(path.join(root, "app/globals.css"), "utf8"), /\.collage|--tape-|\.card::before/);
});
