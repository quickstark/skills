I’ll read the selected guidance and page source, then report concrete motion, media accessibility, and framing findings. I won’t edit files or run browser verification.

I’m using the local `qs-design-frontend` guidance for this read-only audit.

- [ ] Active: inspect source and relevant cinematic guidance.
- [ ] Pending: report findings with source references.

Stage: Source audit | Stage estimate: ~10% | Overall estimate: ~10% | Continuing — guidance loaded; page inspection is next. Input needed: none.

The source has clear motion and media accessibility gaps. No files were changed.

- **The primary action repeatedly fades almost away.** `.cta` applies `pulse 2s infinite`, ending at `opacity:.1`. This affects “Explore the work,” including its focus outline. There is no pause mechanism or reduced-motion override. Keep this interactive control static and fully visible. The “Show details” button is not animated.
- **The intentionally missing media has no authored fallback.** `<video autoplay loop src="missing.webm">` references an absent file and has no poster, fallback image, or error handling. The verified local fixtures exist but are unused. Provide a persistent static composition using `assets/poster.svg`; preserve useful content when media fails.
- **Playback has no accessible motion controls.** There are no native controls or custom pause button, no reduced-motion handling, and no offscreen/page-hidden pause logic. These are source-level omissions; the missing file means actual looping and playback cannot be established.
- **Autoplay setup is incomplete.** The video lacks `muted` and `playsinline`. Playback permission, audible output, and inline versus fullscreen behavior remain unverified. If the footage is decorative, use silent inline playback with a static fallback and user pause control.
- **Framing is unspecified.** No video dimensions, responsive sizing, aspect ratio, focal point, or crop rules are defined. The poster places its circle at 75% of the image width; a future centered cover crop could lose that subject on narrow screens. Establish framing for both poster and footage. Copy currently follows the video, so source inspection does **not** establish a text-over-footage contrast defect.
- **The media’s accessible purpose is unclear.** Decorative footage should be excluded from assistive reading; meaningful footage needs appropriate description and alternatives. The source does not establish which role is intended, so a definite captions violation cannot be claimed.

Evidence: [index.html](/tmp/ms-fe-01-v5-C5-candidate-2/index.html:1), [poster.svg](/tmp/ms-fe-01-v5-C5-candidate-2/assets/poster.svg), [rights.json](/tmp/ms-fe-01-v5-C5-candidate-2/assets/rights.json).

Browser/runtime behavior—including rendered contrast, responsive layout, keyboard interaction, playback, and loop boundaries—is **unverified** and belongs to the central observer.

- [x] Verified: bounded source audit and relevant guidance reads.

Status: Complete — audit only.  
Skills used: local `/qs-design-frontend`.  
Specs: Not located; the supplied audit brief governed scope.  
Work summary: Finished — source findings delivered; media-path absence checked; no edits. Next — central observer’s browser qualification and independent review remain pending.  
Next work prompt: None — observer work is already assigned.