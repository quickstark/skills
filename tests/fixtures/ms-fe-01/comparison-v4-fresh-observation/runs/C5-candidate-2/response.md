I’ll read the selected guidance and inspect `index.html` for motion, media accessibility, and framing issues. I’ll keep this audit read-only and leave browser/runtime behavior unverified.

I’m using the local `qs-design-frontend` guidance for this audit.

- [ ] Active: inspect the source and relevant motion/media guidance.
- [ ] Pending: report concrete findings and playback limitations.

Stage: Source audit | Stage estimate: ~10% | Overall estimate: ~10% | Continuing — selected guidance read. Input needed: none.

The source audit is complete. No files were changed. **Browser/runtime behavior remains unverified**, including playback, focus rendering, responsive layout, and loop quality.

Findings in [index.html](/tmp/ms-fe-01-v4-C5-candidate-2/index.html:1), in priority order:

1. **The primary action continually fades almost away.** `.cta` runs `pulse 2s infinite`, reaching `opacity:.1`. This affects the label, background, and focus outline while the link remains interactive. There is no reduced-motion override or stop mechanism. Keep the action and its focus indicator static.

2. **The intentionally missing media has no visual fallback.** `missing.webm` is absent, and the video has no poster, fallback image, or error handling. The verified local fixtures exist but are unused. The surrounding copy remains available; the browser’s failed-media presentation was not observed.

3. **Playback has no user control or preference handling.** The video declares `autoplay loop` without native controls or a pause button. There is no reduced-motion, offscreen, or page-visibility handling. `muted` and `playsinline` are also absent. These are observable markup omissions—not evidence that autoplay succeeds, fails, or produces sound.

4. **Responsive media framing is unspecified.** The video has no dimensions, aspect ratio, responsive width constraint, or focal-point rules. Its placement before the headline makes its rendered size important to the reading sequence. Narrow-screen overflow and headline displacement require browser qualification. The supplied poster is 16:9 with its circle at 75% width; any future cover crop should check that subject across viewport sizes. The current source does not overlay text on footage, so footage/text contrast failure cannot be established here.

5. **The media’s accessibility role is unresolved.** The video is neither explicitly decorative nor presented as meaningful content with accessible playback alternatives. Establish that role first: meaningful media may require captions, description, or a transcript depending on its actual content. Missing playback prevents assessing those needs from this page.

6. **The details disclosure lacks an exposed state.** Its handler toggles `hidden`, but the button has no `aria-expanded` or `aria-controls`, and its label stays “Show details.” The document also lacks `lang="en"`.

- [x] Verified: relevant local guidance and source inspected; missing path and supplied poster checked.

Status: Complete — read-only audit  
Skills used: /qs-design-frontend  
Specs: User’s audit brief; [local cinematic guidance](/tmp/ms-fe-01-v4-C5-candidate-2/guidance/skills/frontend/internal/cinematic-landing.md)

Work summary:

- Finished — concrete motion, media accessibility, and framing findings; no implementation or notes edits.
- Next — central observer owns browser qualification and independent quality review.

Next work prompt: None — qualification is already assigned.