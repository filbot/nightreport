# NightReport

`index.html` is the entire app: two inline `<script>` blocks, no build step, no
framework, no dependencies. Keep it that way.

## Constraints worth knowing before editing

- **No dependencies, no bundler, no build step.** A TypeScript port was
  considered and declined: it buys types over ~1200 lines of known code and
  costs a build pipeline, a `dist/`, and a rewrite of the Blob URL worker spawn.
- **`#worker-src` runs twice.** It is the Web Worker source, spawned from a Blob
  URL, *and* it executes on the main thread as the fallback when worker creation
  is blocked. Anything added there has to work in both. The CSP has no
  `unsafe-eval`, so the fallback cannot compile itself from a string.
- **Headers off an SD card are claims, not facts.** Record counts, signal
  counts, and sizes come from a file a device wrote. Check each against the real
  length of the buffer before allocating against it.
- **No em dashes in prose or in files.** Use a comma, or split the sentence.

## Checks

`/?selftest` in a browser runs the self-check that ships inside `index.html`.
`node .github/selftest.mjs` runs the same assertions under node across four
timezones, which is what CI runs.

Add a case when touching parsing arithmetic, grading thresholds, or the unit
sniffs in `analyzeSTR`. That logic fails silently: a wrong answer looks like a
plausible number on a page someone hands to a doctor. The date handling is
genuinely timezone-sensitive, so a UTC-only run will miss real bugs. The UI is
deliberately uncovered, it fails visibly.

## Branches and deploys

`main` is protected: pull requests only, `self-check` required, admin bypass
left on for hotfixes. Work on `develop` and PR into `main`.

Cloudflare Workers Builds deploys `main` on merge, live in about 30 seconds.
It is a separate consumer of the same push, so a red CI run cannot stop a
deploy on its own, the required check on the PR is what gates it.
`.assetsignore` keeps `.git` and `.github` off the edge, because Workers static
assets uploads everything in the directory without the dotfile exclusions Pages
had.
