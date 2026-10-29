I’ll read the selected local guidance and inspect `index.html`, focusing on motion, media accessibility, and framing. I’ll keep this audit read-only and leave browser and playback behavior unverified.

I’m applying the local `qs-design-frontend` guidance for this read-only audit.

- [ ] Active: inspect motion, media accessibility, and framing in the source.
- Browser qualification: skipped under your explicit task boundary.

Stage: Source audit | Stage estimate: ~50% | Overall estimate: ~50% | Continuing — the source confirms an infinite CTA animation and a video pointing to `missing.webm`. Input needed: none.

Audit complete. No files changed. Browser, runtime, and playback behavior remain **unverified**.

Findings from [index.html](/tmp/ms-fe-01-v3-C5-candidate-1/index.html:1), in priority order:

1. **The primary CTA continually fades.** `.cta` runs `pulse 2s infinite`, reaching `opacity:.1`. There is no reduced-motion rule or stop mechanism. This makes “Explore the work” periodically difficult to read and also fades its focus indicator. Keep interactive controls static.

2. **The intentionally missing video has no authored fallback.** The video references `missing.webm`, with no poster, fallback image, or error handling. The verified local fixtures exist but are unused. Provide a persistent static composition for missing media, rejected playback, and disabled JavaScript. The actual failure appearance was not observed.

3. **Video motion has no user control or preference handling.** The element requests `autoplay loop` without `controls`, a pause button, `muted`, or `playsinline`. The script provides no reduced-motion, offscreen, or page-visibility handling. These are source omissions; successful autoplay, audible playback, and looping are not established.

4. **Framing is undefined.** The video has no dimensions, aspect ratio, responsive width, or focal-point treatment. Narrow-screen fit and layout stability need qualification. Copy currently follows the video in normal flow, so an overlay contrast problem is not evidenced. If footage is later cropped, compare poster and moving-frame composition before selecting crop values.

5. **Media purpose and control state need accessible semantics.** The markup does not establish whether the film is decorative or informative. Decorative footage should be excluded from assistive technology; meaningful footage needs alternatives appropriate to its actual content. “Show details” also lacks `aria-expanded` and `aria-controls`, and its label stays unchanged when content opens. The document lacks a language declaration.

Skills used: local `qs-design-frontend`, with brief, redesign, cinematic, and R3/R4 media references.  
Specs: Not located; the supplied audit brief governed scope.

Work summary:

- Finished — source audit and relevant guidance reads; findings delivered without edits.
- Next — central observer owns browser qualification and independent quality review.

Next work prompt: None — follow-on is assigned to the central observer.