# Uniform supplementary HTTP observation

The original frozen browser observer loads `file://` and rejects every HTTP
request. A valid static site using `/styles.css` or `/script.js` therefore resolves
those files against the filesystem root and can appear unstyled or inert. The
static-web task does not require file-URL compatibility. This separate observer
adds local HTTP evidence; it never replaces or edits the original observer,
original screenshots, model output, bundle, source, frozen plan or rubric.

## Frozen collection policy

Apply this supplementary observer to **every completed implementation output**
across both variants and all repetitions, including failures. Select using each
opaque review bundle's `context.json` task mode (`implementation`), without consulting
variant/operator mappings. Preserve a collection inventory with every eligible
bundle, original artifact hash, fresh supplemental directory, outcome and failure.
An absent or failed implementation output remains absent/failed and must be listed;
HTTP observation cannot fabricate its missing result. Do not rerun models or tune
individual outputs. Use one unchanged frozen observer/runtime for all eligible
bundles. Do not pool this with previous experiments or make a latency/cost claim.

Also collect one HTTP observation of the unchanged original `assets/reference.html`
using `reference` mode. This documents transport behavior for the reference page;
it does not replace the supplied immutable reference PNG or change its tolerance.
The parent performs full collection and independent review after reviewing this
preparation. This leaf demonstrates only the specifically authorized opaque bundle.

## Unchanged browser measurements

`browser-observe-http.mjs` is a derivative of the exact frozen v2 observer. The
entire measurement block is byte-identical and has a focused preservation test:
1280×900 and 390×844 screenshots, document width/text/links/IDs/landmarks, computed
body/heading fonts, controls and labels, fourteen keyboard focus observations,
invalid email, keyboard submission/events/feedback, and reduced-motion observations.
No new quality score, threshold or acceptance check is introduced. Actual HTTP
behavior can differ from file URLs; retain both and explain the transport difference.
Brand/style quality and any unchanged observer omissions still need independent
review of actual artifacts and images. HTTP success is not a passing adoption grade.

The same existing Chromium binary and Puppeteer entry are used. Additional launch
arguments only enforce network isolation: a loopback deny-all proxy, an exact
artifact-origin bypass, disabled background networking/QUIC and no unproxied WebRTC
UDP. Those flags are frozen and identical for every supplementary capture. This
is an explicitly separate environment observation, not a claim that file and HTTP
environments are identical. No browser/package installation occurs.

## Isolation and retained evidence

The input artifact root must be a real local directory; symlinks, special files,
path escapes and files changing during snapshot acquisition are rejected. A fresh
output contains a byte-identical artifact copy. A port-0 server binds only
127.0.0.1 and serves its captured in-memory bytes with GET/HEAD. It rejects unsafe
methods, host mismatches, traversal, backslashes, malformed encoding, missing files
and symlinks. Limits: 4096 files, 64 MiB per file, 128 MiB total. It never forwards
requests or provides filesystem write routes.

Page request interception permits only the exact local origin plus inline data/blob
resources. Other origins are aborted; worker/WebSocket traffic is additionally
confined through the local deny-all proxy, which never opens an outbound connection.
Real browser controls use an independent sentinel server to prove no contact for
ordinary fetch, worker fetch and WebSocket attempts. Requests and denied proxy
requests remain in the transport evidence. Original and copied before/after file
hashes are compared. Both local servers and the browser close on success/failure.
A failed browser launch retains a separate failure receipt and unchanged originals.

## Commands

```sh
node --test tests/fixtures/frontend-adoption-v2-http/observer.test.mjs
node tests/fixtures/frontend-adoption-v2-http/observer.mjs verify
node tests/fixtures/frontend-adoption-v2-http/observer.mjs observe /absolute/opaque-bundle/actual-artifacts /absolute/fresh-supplemental-directory
node tests/fixtures/frontend-adoption-v2-http/observer.mjs observe /absolute/original-assets /absolute/fresh-reference-directory reference
```

Output directories must be fresh and disjoint from source artifacts. The CLI checks
all frozen code/protocol hashes, the Node version, browser binary and Puppeteer entry
before capture. It cannot assert a full hash of every transitive library/runtime
component; those supplied installations must remain unchanged during collection.

`plan.json` freezes the uniform policy, source/runtime identities and preserved
measurement scope. `evidence.md` records tests and the single authorized opaque
capture. All screenshots are actual browser captures, not generated mockups or
source-count substitutes. Full collection, grading and adoption remain parent work.
