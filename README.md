# NightReport

**A plain-English report card for your CPAP therapy.** Reads the SD card from a ResMed AirSense 10/11 in your browser and grades what it finds, with a printable summary for doctor visits.

[**Open the app**](https://nightreport.app/) · [**See a sample report**](https://nightreport.app/#demo) · [Report an issue](https://github.com/filbot/nightreport/issues)

> [!NOTE]
> There is no backend. All parsing and analysis happens in your browser, and your therapy data never leaves your device. To verify: turn off wifi after the page loads, then run an analysis.

| What you give it | What you get back |
| --- | --- |
| A ResMed SD card, as a folder or `.zip` | A graded report card, plus a printable one-page summary for your doctor |

No install, no account, no upload. Free and open source under the MIT license.

---

## Will it work with my machine?

| Device | Status |
| --- | --- |
| **AirSense 10 / 11** | Supported and tested |
| **AirCurve 10 / 11** | Same format family, expected to work, not yet verified against real data |
| **AirMini** | No SD card, so there is nothing to read |
| **Philips, Löwenstein, others** | Different proprietary formats. Not planned |

If you have an AirCurve, you can help confirm it: load your card, use **Copy debug report** in the app's data guide, and open an issue with the result. That report contains file structure and signal labels only, no measurements, dates, or serial numbers.

For unsupported machines, [OSCAR](https://www.sleepfiles.com/OSCAR/) is a free desktop app that covers most brands and goes considerably deeper. NightReport detects a Philips card and says so, rather than failing with a generic error.

---

## Getting your data

1. With the machine idle, not during therapy, press the SD card in gently so it pops out.
2. Put it in a card reader. A basic USB or USB-C reader costs about $10 and works with phones.
3. Choose the card's folder in the app, or zip it first on mobile.

Reading the card changes nothing on it. Pop it back in when you're done and logging continues as normal.

---

## How it works

The whole app is `index.html`. No build step, no framework, no dependencies. Vanilla JS in two inline script blocks: the UI, and a parsing engine.

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

**No dependencies.** No npm packages, CDN scripts, or third-party fonts. Everything is in this repo, in one file.

**EDF parsing.** EDF is fixed-offset ASCII headers plus little-endian int16 samples, handled with a `DataView` and typed arrays. ResMed's event files are EDF+D (discontinuous) with TAL annotations, which most libraries can't read, so those are parsed by hand.

**Zip extraction.** Reads the zip central directory and inflates entries with the browser's native `DecompressionStream`, in about 60 lines. Only the files the analysis actually needs get decompressed.

**Waveform files are never read.** BRP files are filtered out by filename before any bytes load, and nightly detail is capped at the 14 most recent sessions. A year of data parses in under a second.

**File I/O on the main thread, ArrayBuffers into the worker.** Avoids a WebKit bug where reading cloned `File` handles inside a worker fails.

**Headers are treated as claims, not facts.** Record counts, signal counts, and sizes all come out of files written by a device, so each is checked against the real length of the file before use. Zip and folder inputs are both capped so a malformed archive can't exhaust memory.

### What it reads

ResMed's SD card layout, as written by an AirSense 10/11:

| File | Contents | Used for |
| --- | --- | --- |
| `STR.edf` | One record per day: usage, AHI breakdown, pressures, leak, settings | Headline grades, compliance %, doctor summary |
| `DATALOG/*/[ts]_PLD.edf` | 0.5 Hz pressure, leak, flow limitation, snore | Pressure stability, airway grades |
| `DATALOG/*/[ts]_EVE.edf` | Scored events as EDF+D annotations | Event counts |
| `DATALOG/*/[ts]_SA2.edf` | Oximetry, if a sensor is attached | Presence detection |
| `DATALOG/*/[ts]_BRP.edf` | 25 Hz flow/pressure waveforms | Skipped |

The pipeline is staged as detect → parse → normalized summary → UI, so adding a brand later means writing a parser that emits the same summary object. Nothing downstream changes.

---

## Network behavior

| What | Where it goes |
| --- | --- |
| **Therapy data** | Nowhere. Never transmitted, never stored, not in `localStorage`. Read into memory, analyzed, rendered, gone when the tab closes |
| **The page** | One static HTML file, plus `og.png` for link previews. System fonts |
| **Analytics** | Aggregate visit counts via Cloudflare Web Analytics. No cookies, no persistent identifiers, no cross-site tracking, no custom events |

`_headers` sets a Content-Security-Policy starting at `default-src 'none'`, permitting only inline code, the `blob:` worker, and Cloudflare's beacon. Requests to any other origin are blocked by the browser. `Referrer-Policy: no-referrer` keeps outbound links from carrying the site as a referrer.

**To check for yourself:** open devtools and run an analysis. The network tab shows the page and at most one `cloudflareinsights.com` request.

---

## Running locally

```sh
git clone https://github.com/filbot/nightreport
cd nightreport
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` straight from disk mostly works. Some browsers restrict Blob workers on `file://` URLs, and the app falls back to inline parsing when that happens.

## Deploying

Cloudflare Pages: connect the repo, no build command, output directory `/`. Enable Web Analytics in project settings for visit counts. `_headers` ships the CSP automatically.

Any static host works. To fork without analytics, delete the two `cloudflareinsights` entries from the CSP, and the site then makes no external requests at all.

---

> [!IMPORTANT]
> **Not a medical device.** NightReport describes what the machine recorded. It does not diagnose and does not recommend settings changes. The printable summary is for discussing therapy with a sleep provider. Provided free and as-is, without warranty of any kind.

NightReport is an independent project and is not affiliated with or endorsed by ResMed. ResMed, AirSense, AirCurve and AirMini are trademarks of ResMed, used here only to describe compatibility.

## License

MIT
