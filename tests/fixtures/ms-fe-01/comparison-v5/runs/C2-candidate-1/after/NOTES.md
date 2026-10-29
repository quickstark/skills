Preserve-mode authoring: two original sections, all original copy/links/IDs/tokens,
CTA and browser-default control styles, and original analytics/details script retained.

Selected R1/R2: text-only entrance/once-only viewport motion; 600ms, 0/70/140ms
entrance delays and 0/80ms reveal delays, cubic-bezier(.22,1,.36,1), opacity .75→1,
y 14px→0. Controls and their ancestors remain static. Reduced motion cancels/skips.
R3/R4: verified repository-owned assets/scene.webm and assets/poster.svg (rights.json).
Native loop; no speculative loop fade. Full-width media, object-fit cover, focal
point 70% 50%; desktop 2.2:1, tablet 16:9, mobile 4:3. Breakpoints 900/540px;
wide gutters at 1100px. Text uses solid paper backing. Poster persists without JS,
observation, playback support or on failure. Playback pauses offscreen/page-hidden;
manual pause persists. Teardown returns to poster, including bfcache restoration.

Limitations: browser/runtime behavior, actual video frames/crop/loop, responsive
rendering, keyboard interaction and computed styles are unverified; central observer
owns all browser qualification and independent review. No server, browser, install,
external service or second verification workflow used. Static check recorded below.

Static check passed: original content/links/IDs/tokens/control rules and original
behavior script preserved; two sections; node --check passed for both scripts;
fixture SHA-256 values match rights.json. No runtime claims.
