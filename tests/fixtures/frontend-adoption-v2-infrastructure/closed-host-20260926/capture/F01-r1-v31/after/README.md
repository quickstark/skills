# Northstar Museum membership

Static HTML, CSS, and JavaScript. No build step, packages, external assets, or network services are required.

For a local preview, run `python3 -m http.server 8000 --bind 127.0.0.1` from this directory and open `http://127.0.0.1:8000`. Stop the preview with Ctrl+C. Serve this directory as the web root so the absolute asset and page links resolve.

The main page is `index.html`. Membership details, privacy information about the local form, and accessibility information are included as directory index pages.

The required email field uses browser validation. A valid submission stays on the page, displays confirmation, and appends `{ name: 'join_started', plan: 'family' }` to `window.__events`. Email addresses are never transmitted or persisted. JavaScript is required for continuation.

## Verification

Actual browser results are in `evidence/browser-results.json`. The checks covered 1280×900 and 390×844 viewports, horizontal overflow, keyboard submission, empty and invalid input, confirmation text, analytics payload, and linked pages. No page errors or external requests were observed. Dark appearance and reduced-motion preferences were also exercised.

Screenshots: `evidence/wide.png`, `evidence/narrow.png`, and `evidence/narrow-dark.png`. These are browser captures, not generated images.

`evidence/verify.cjs` uses the scenario-provided Chromium and Puppeteer paths. It starts a temporary loopback server and closes both the browser and server on completion.
