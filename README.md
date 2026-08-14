# NightReport

Reads the SD card data from a ResMed AirSense 10/11 and produces a plain-English report card of the therapy data, plus a printable summary for doctor visits.

**[Live site](https://nightreport.app/)** · **[Sample report](https://nightreport.app/#demo)**

There is no backend. All parsing and analysis happens in the browser. To verify: turn off wifi after the page loads and run an analysis.

## Architecture

The whole app is `index.html`. No build step, no framework, no dependencies. Vanilla JS with two inline script blocks: the UI, and a parsing engine that runs in a Web Worker.

```
SD card / zip
     │
     ▼
main thread          reads files into ArrayBuffers (File System Access API,
                     webkitdirectory fallback, or drag-and-drop)
     │
     ▼
Web Worker           parses EDF, computes stats, grades categories
     │               (spawned from a Blob URL, with an inline fallback
     ▼                if worker creation is blocked)
report card UI       progressive render: summary first, nightly detail streams in
```

Implementation notes:

- **No dependencies.** No npm packages, CDN scripts, or third-party fonts. All code is in this repo, in one file.
- **Zip extraction.** Reads the zip central directory and inflates entries with the browser's native `DecompressionStream`. About 60 lines. Only the files the analysis needs get decompressed.
- **EDF parsing.** EDF is fixed-offset ASCII headers plus little-endian int16 samples, handled with a `DataView` and typed arrays. ResMed's event files are EDF+D (discontinuous) with TAL annotations, which most libraries can't read, so those are parsed manually.
- **Waveform files are never read.** BRP files are filtered out by filename before any bytes load. Nightly detail is capped at the 14 most recent sessions. A year of data parses in under a second.
- **File I/O on the main thread, ArrayBuffers into the worker.** Avoids a WebKit bug where reading cloned `File` handles inside a worker fails.

## Network behavior

- **Therapy data:** never transmitted, never stored, not in `localStorage`. Files are read into memory, analyzed, rendered, and gone when the tab closes.
- **The page:** one static HTML file plus `og.png` for link previews. System fonts.
- **Analytics:** aggregate visit counts from Cloudflare Web Analytics. No cookies, no persistent identifiers, no cross-site tracking, no custom events.

`_headers` sets a Content-Security-Policy starting at `default-src 'none'`, allowing only inline code, the `blob:` worker, and Cloudflare's beacon. Requests to any other origin are blocked by the browser. `Referrer-Policy: no-referrer` keeps outbound links from carrying the site as a referrer.

To check: open devtools and run an analysis. The network tab shows the page and at most one `cloudflareinsights.com` request.

## What it reads

ResMed's SD card layout, as written by an AirSense 10/11:

| File | Contents | Used for |
|---|---|---|
| `STR.edf` | One record per day: usage, AHI breakdown, pressures, leak, settings | Headline grades, compliance %, doctor summary |
| `DATALOG/*/[ts]_PLD.edf` | 0.5 Hz pressure, leak, flow limitation, snore | Pressure stability, airway grades |
| `DATALOG/*/[ts]_EVE.edf` | Scored events as EDF+D annotations | Event counts |
| `DATALOG/*/[ts]_SA2.edf` | Oximetry, if a sensor is attached | Presence detection |
| `DATALOG/*/[ts]_BRP.edf` | 25 Hz flow/pressure waveforms | Skipped |

Device support:

- **AirSense 10/11:** supported and tested.
- **AirCurve 10/11:** same format family, expected to work, not yet verified with real data. If you have one, load your card and use "Copy debug report" in the data guide, then open a GitHub issue with it. The report contains file structure and signal labels only. No measurements, dates, or serial numbers.
- **AirMini:** no SD card, nothing to read.
- **Philips, Löwenstein, others:** different proprietary formats. Not planned. The app detects Philips cards and says so instead of failing with a generic error. [OSCAR](https://www.sleepfiles.com/OSCAR/) supports most machines and goes much deeper.

The pipeline is staged as detect → parse → normalized summary → UI, so adding a brand later means writing a parser that emits the same summary object. Nothing downstream changes.

## Running locally

```
git clone https://github.com/filbot/nightreport
cd nightreport
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` from disk mostly works. Some browsers restrict Blob workers on `file://` URLs, and the app falls back to inline parsing when that happens.

## Deploying

Cloudflare Pages: connect the repo, no build command, output directory `/`. Enable Web Analytics in project settings for visit counts. `_headers` ships the CSP automatically.

Any static host works. To fork without analytics, delete the two `cloudflareinsights` entries from the CSP. The site then makes no external requests at all.

## Not a medical device

NightReport describes what the machine recorded. It does not diagnose and does not recommend settings changes. The printable summary is for discussing therapy with a sleep provider.

## License

MIT
