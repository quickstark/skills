I’ll read the selected local guidance and inspect `index.html` for motion, media accessibility, and framing issues. I won’t edit files or run browser checks.

I’m using the local `qs-design-frontend` guidance for this read-only audit.

- [ ] Active: inspect the source and relevant guidance for motion, media, and framing findings.

Stage: Source audit | Stage estimate: ~10% | Overall estimate: ~10% | Continuing — guidance read; source inspection is next. Input needed: none.

Status: Complete — read-only audit. No files changed. Browser/runtime behavior remains unverified.

The main findings are visible in [index.html](/tmp/ms-fe-01-v3-C5-candidate-2/index.html:1):

1. **The primary action repeatedly fades almost away.** `.cta` runs `pulse 2s infinite`, reaching `opacity:.1`. This affects the link’s text, background, and focus outline. There is no reduced-motion override or pause mechanism. Keep the action and focus indicator static; apply optional motion to noninteractive content.

2. **The intentionally missing media has no authored fallback.** The video references `missing.webm`, with no poster, fallback image, or error handling. The verified local fixtures exist but are unused. Use `assets/poster.svg` as a persistent static fallback and show it when playback is unavailable. The missing reference is observable; the browser’s resulting presentation was not tested.

3. **Looping playback has no user control or motion policy.** The video declares `autoplay loop` without native controls or a separate pause button. There is no reduced-motion handling or offscreen/page-hidden pause logic. It also lacks `muted` and `playsinline`. Actual autoplay acceptance, sound, duration, and looping cannot be established from this source.

4. **Responsive framing is unspecified.** The video has no sizing rules, aspect-ratio reservation, focal point, or narrow-screen treatment. Establish a responsive media box and deliberate crop. The supplied poster places its circle at roughly 75% across and 50% down; a centered cover crop could remove that subject on narrow screens. Footage framing remains unverified. Copy currently follows the video in document flow, so an overlay contrast defect cannot be inferred.

5. **The media’s accessible purpose is unresolved.** There is no explicit decorative treatment or meaningful-media alternative. If decorative, hide the video from assistive technology and retain an accessible pause control. If it communicates film content, determine the necessary captions, description, or transcript from the actual content; this audit cannot establish those requirements.

6. **The details disclosure lacks exposed state.** Its handler toggles `hidden`, but the button has no synchronized `aria-expanded` or `aria-controls`. The document also lacks a language declaration.

- [x] Source and relevant local guidance inspected.
- Browser qualification skipped under the explicit task boundary.

Specs: Not located; the user’s audit brief governed scope.

Work summary:

- Finished — motion, media accessibility, and framing audit with source-grounded findings; no implementation or notes edits.
- Next — Central observer owns browser/runtime qualification and independent quality review.

Next work prompt: None — observer work is already assigned.