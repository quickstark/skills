# FIELD NOTES

Implemented `index.html` with inline CSS/JS. Open it directly; no build step or dependencies. The user brief in chat is the content authority. Local guidance read: the selected frontend skill and its brief, design direction, implementation, and restrained treatment references. Supplied fixture hashes match `assets/rights.json`; assets are unchanged.

Selected parameters:
- Background `#f6f3eb`, ink `#163b43`, accent `#bf4e2e`; system sans; square controls. Fluid page gutters 24–64 px, maximum page width 1728 px. Breakpoints 800 and 540 px; landscape adaptation at height ≤500 px.
- Large editorial heading, wide cropped film frame, two plain work rows and the supplied about text. All four links retain the exact authorized destinations; no additional sections or claims.
- Muted, looping, inline video starts through JS when motion is allowed. Pause/play button has a changing accessible name. Visibility and viewport changes suspend playback; user pause persists. Reduced motion shows the local poster without initially loading video. No JS, rejected autoplay, and video errors retain the poster; rejected autoplay offers manual play. No scroll-driven or entrance animation.
- Primary text is 20 px, weight 700: accent/paper contrast 4.36:1 meets the large-text threshold. Ink/paper contrast is 10.88:1. Navigation hover keeps ink text and uses an accent underline. Focus has a visible 3 px outline.

Verification:
- Passed HTML content/destination allowlist, unique ID, local asset path, fixture hash and no remote reference checks; JS syntax passed.
- Simulated DOM tests passed playback, pause/restart, persistent pause, visibility suspension, initial/live reduced motion, rejected autoplay/manual retry, and media error fallback. These tests do not establish real browser playback or keyboard behavior.
- Source reviewed for 375, 768, 1440 px and short landscape. Actual visual layout, keyboard traversal, video decoding and browser reduced-motion behavior remain unverified: the available browser primitive failed to launch because its configured Firefox executable is absent. No browser or dependencies were installed, and no external services were called. Browser screenshots are unavailable.
