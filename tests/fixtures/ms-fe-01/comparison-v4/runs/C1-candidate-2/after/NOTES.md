# FIELD NOTES

- Built `index.html`: inline CSS/JS, system sans, #f6f3eb / #163b43 / #bf4e2e, square controls; supplied copy and destinations only.
- Guidance: local frontend brief, design direction, implementation, restrained style, cinematic landing and media recipes. Selected R3: decorative local footage with native looping, no entrance animation or loop fade. No delay; visibility triggers playback. Copy and links remain static.
- Fixtures: `assets/scene.webm` and `assets/poster.svg`; verified local rights supplied in `assets/rights.json`. Cover framing at 70% center; desktop aspect 2.15, tablet 1.8, mobile 1.45, short landscape 2.5.
- Poster remains with JavaScript disabled, reduced motion, initialization failure or media failure. Pause is keyboard accessible; offscreen/hidden-page playback pauses. Page exit disposes listeners and observer; history restoration may retain the static poster.
- Responsive parameters: 540px / 900px breakpoints; short landscape at height <=500px. No dependencies, remote assets, build step or external calls.
- Validation: inline JavaScript passed `node --check`; shell inspection confirmed supplied copy, destinations and nonempty local fixtures. Browser/runtime, actual codec playback, loop continuity, focus behavior and rendered 375/768/1440/short-landscape layouts remain unverified for the central observer. No browser, server, installation or second verification workflow run.
