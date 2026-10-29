# Cinematic marketing and portfolio work

Load this entry only when the brief or selected reference calls for cinematic media
or motion in a marketing page or portfolio. A generic improvement request is not
sufficient. A still reference does not authorize invented motion. Explicitly static
work stays static; dashboards and multistep product flows do not inherit these
techniques. The sole public owner is `qs-design-frontend`.

Recover the existing brief first. Brand, factual copy, URLs, analytics, behavior,
stack, accessibility, supplied references and authorized scope override every
example below. Do not add sections, claims, destinations, dark themes, pill buttons,
fonts or decorative motion by default. Numeric values are adjustable starting points.

Choose the smallest technique that serves the brief:

- Entrance choreography or a once-only viewport reveal: then read
  [motion recipes](motion-recipes.md), selecting R1 or R2.
- Verified background footage, crop/text protection or an imperfect loop: then read
  [media recipes](media-recipes.md), selecting R3, R4 or R5. Prefer a naturally
  seamless clip before adding a fade.

Do not load recipe files before selecting a relevant technique. Use browser
primitives or the project's existing stack; these recipes require no new runtime
dependency. WebGL, scrubbing, pinned scroll stories and complex carousels are outside
this addition.

Check composition before adding motion. Let supplied copy determine column width
and type scale; avoid accidental one-word headline lines or a cramped default split.
On narrow screens, keep heading, primary action and media compact. If a split
squeezes the headline, use a wider copy area with media below.
In preserve mode, retain navigation, CTA and control styling, including browser
defaults: font size, padding, borders, line height, colors and text decoration.
Add motion/media through separate wrappers.

Keep a compact working record in existing task notes, not a mandatory design document:

- Selected technique and purpose; trigger, delay, duration, easing and initial/final states.
- Asset source and verified rights; focal point, desktop/mobile crop, poster and fallback.
- Elements that remain static, including controls during entrances.
- Viewports, motion preferences, failure states and completion evidence.

Use supplied or otherwise verified appropriately licensed assets. Asset generation
still needs the existing task authority; this guidance grants none. Missing assets,
rejected playback or unsupported codecs require a usable static fallback and a
truthful limitation. Missing packaged references mean an incomplete package; never
fetch another public skill to conceal the omission.

Audit-only returns findings without product mutations. Prompt-only produces the
requested prompt without image generation or product execution. Image-only work
performs no product implementation. No private reference starts a public workflow.

Verify early and settled views, keyboard/focus and actions throughout motion,
375/768/1440 widths, short landscape and touch emulation. Check reduced motion,
disabled JavaScript, interrupted initialization, delayed fonts, media failures,
loop boundaries, offscreen pause and teardown. Sample footage near start/middle/end
for contrast, readability and subject framing. Record actual browser/codec and
screenshots; emulation proves emulated coverage only. Unexpected console errors,
failed requests and broken assets block acceptance; distinguish injected failures.

Adapted from MotionSites at `faa30d512e3973e58675c72101a7ef42ed37ae83`;
see the package's `THIRD_PARTY_NOTICES.md` and `dependency-index.json`.
