# Authoring notes
- Preserve mode; standard effort, brief report. Only `index.html` and this note edited; two existing sections and all original copy, destinations, IDs, brand/control declarations, analytics and details handler retained.
- Local `scene.webm` is the hero media; `poster.svg` provides the fallback and selected-work still. Asset authority: `assets/rights.json`.
- Desktop split composition; stacked layout at 640px, intermediate adjustment at 900px. Entrances: 850–1100ms; viewport reveals: 750ms, 12% visibility threshold.
- Native video controls; one automatic playback attempt at 20% visibility, only without reduced motion. Pause offscreen, on hidden document, or when reduced motion is enabled; later playback remains user-controlled. No observer support leaves static content and manual playback available.
- Browser/runtime, rendered responsive behavior, keyboard interaction and media playback remain unverified; the central observer owns qualification. No browser, server, dependency installation, build or external service used.
- Static checks passed: exact original text/IDs/destinations/analytics marker, section count, original CSS/control rules and original interaction script; inline JavaScript syntax; fixture hashes against the rights manifest. No runtime qualification performed.
