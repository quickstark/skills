# FIELD NOTES

- Authored `index.html`: inline CSS/JS, system sans, #f6f3eb / #163b43 / #bf4e2e, square controls; supplied copy and destinations only.
- Guidance: selected local qs-design-frontend root, brief, design direction, implementation, restrained style, cinematic landing, media recipes. Selected R3/R4: decorative footage with separate readable copy and static poster; native loop without added loop effects.
- Media: verified local fixtures `assets/scene.webm` and `assets/poster.svg`; rights in `assets/rights.json`. Desktop frame 2.3:1, tablet 16:9, mobile 4:3; cover crop at 65% center. No asset generation or external requests.
- Motion: immediate playback when intersecting; pause on user action, hidden page, offscreen, or reduced motion. Reduced motion and no JS retain the poster. Playback rejection/error retains poster with retry control. Controls and copy stay static; arrow hover uses 180ms ease, disabled for reduced motion.
- CSS targets 375/768/1440 and short landscape through fluid sizing and 560px/900px/500px-height queries. Keyboard focus styles and native controls authored.
- Limitations: browser/runtime, codec playback, moving-frame crops, loop seams, responsive rendering, keyboard operation, reduced motion, and injected failures remain unverified; central observer owns qualification. No browser, server, installation, external service, or independent review run.
- Bounded source check passed: inline JavaScript syntax via existing Node; required copy, exact link destinations, unique anchor IDs, and local media paths via Python HTMLParser. No browser/runtime conclusions drawn.
