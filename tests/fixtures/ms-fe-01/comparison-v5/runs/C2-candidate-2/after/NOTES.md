# Authoring notes

- Preserve-mode revision of `index.html`; exactly two original sections, original copy, destinations, IDs, brand tokens, control styling and analytics/details script retained.
- R1/R2: text-only entrance and once-only viewport reveals; 600 ms, 0/80/160 ms delays, 14 px / .75 opacity to resting state, cubic-bezier(.22,1,.36,1). Existing controls and their ancestors stay static; content is visible without initialization.
- R3/R4: verified repository fixtures `assets/scene.webm` and `assets/poster.svg`; rights in `assets/rights.json`. Decorative muted inline native loop, no loop fade. Both layers use cover at 75% 50%; desktop ratio 2.3, mobile 16/10 below 768 px. Copy remains on paper outside footage.
- Icon pause control; offscreen/hidden-page pause, persistent user pause, lifecycle cleanup. Reduced motion, absent JS/observer, playback rejection and media errors retain the poster. No dependencies, servers, browser tools or external services used.
- Passed bounded check: original copy, sections, IDs, links, base CSS and analytics/details script preserved; local asset references exist; JavaScript syntax passes `node --check`. Browser/runtime behavior, frame crops/contrast, loop boundaries, responsive rendering, keyboard interaction and failure-state execution remain unverified for the central observer.
