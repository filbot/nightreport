// Runs the self-check that ships inside index.html (load /?selftest in a browser)
// under node, once per timezone, because a UTC-only run cannot see the date bugs.
// Usage: node .github/selftest.mjs
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const ZONES = ["UTC", "America/Los_Angeles", "Asia/Kolkata", "Pacific/Kiritimati"];
const MARKER = "/* ── Self-check";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const cut = (from, to) => {
  const i = html.indexOf(from);
  if (i < 0) throw new Error(`index.html no longer contains ${JSON.stringify(from)}`);
  const j = html.indexOf(to, i + from.length);
  if (j < 0) throw new Error(`index.html: no ${JSON.stringify(to)} closing ${JSON.stringify(from)}`);
  return html.slice(i + from.length, j);
};
// The parser and the checks are two separate inline blocks sharing one global scope.
const source = cut('<script id="worker-src">', "</script>") + MARKER + cut(MARKER, "</script>");

let failed = 0;
for (const tz of ZONES) {
  process.env.TZ = tz;                    // node re-reads this per Date since v16
  const printed = [];
  const ctx = {
    TextDecoder,
    console: { log: (...a) => printed.push(a.join(" ")) },
    location: { search: "?selftest" },
    addEventListener: (_event, fn) => fn(),
    document: {
      title: "",
      createElement: () => ({ style: {}, innerHTML: "" }),
      body: { style: {}, replaceChildren(){} }
    }
  };
  runInNewContext(source, ctx);
  const report = printed.join("\n").trim();
  const bad = ctx.document.title.startsWith("FAIL");
  if (bad) failed++;
  console.log(`\n${bad ? "FAIL" : "ok  "}  ${tz}`);
  console.log((bad ? report : report.split("\n").pop()).replace(/^/gm, "      "));
}
process.exit(failed ? 1 : 0);
