I’ll read the selected local guidance and inspect `index.html` for motion, media accessibility, and framing issues. This will be read-only; browser and playback behavior will remain unverified.

I’m applying the local `qs-design-frontend` guidance.

- [ ] Active — inspect the source and relevant guidance for motion, media accessibility, and framing.
- Skipped — browser qualification and independent quality review, which the central observer owns.

The source points to `missing.webm` and applies an infinite opacity animation to the primary link. I’ll distinguish those source findings from playback behavior.

Stage: Read-only audit | Stage estimate: ~40% | Overall estimate: ~40% | Continuing. Input needed: none.

Source inspection found five concrete issues in [index.html](/tmp/ms-fe-01-v4-C5-candidate-1/index.html:1):

1. **The primary link repeatedly fades almost away.** `.cta` runs `pulse 2s infinite`, reaching `opacity:.1`. This fades its label, background, and focus outline together. There is no reduced-motion override or pause mechanism. Keep “Explore the work” and its focus indicator visually stable. The “Show details” button is static in the source.

2. **The intentional media failure has no fallback.** `missing.webm` is absent, and the video has no poster, static alternative, or error feedback. The verified local fixtures exist but are unused. A supplied still could preserve the composition when media is missing, blocked, or unsupported. The actual browser failure presentation remains unverified.

3. **Playback has no accessible control or motion lifecycle.** The video declares `autoplay loop` without native controls or a custom pause button. Neither CSS nor JavaScript responds to reduced-motion preferences, viewport visibility, or page visibility. `muted` and `playsinline` are also absent; autoplay acceptance and mobile presentation cannot be established from source.

4. **The video’s accessibility purpose is unresolved.** It is neither explicitly decorative nor presented as meaningful media with an accessible name and alternatives. Decorative footage should retain a static fallback and accessible pause control. Meaningful footage needs an accessible player and alternatives appropriate to its actual content. Missing media prevents assessing audio, captions, or description needs.

5. **Framing is unspecified.** The video has no authored dimensions, responsive sizing, aspect ratio, crop, or focal point. Copy follows it in normal document flow, so there is no source evidence of a text-over-video contrast problem. Narrow-screen fit, subject retention, and composition remain unverified. The supplied poster is 16:9 with its circle toward the right; a centered cover crop could remove that feature on narrow screens.

Additionally, “Show details” toggles visibility without updating `aria-expanded` or associating the button with `#detail` through `aria-controls`.

- [x] Verified — read-only source audit and relevant local guidance reads.
- Skipped — browser/runtime qualification and independent quality review, assigned to the central observer.

**Status:** Complete — bounded audit only.  
**Skills used:** Local `qs-design-frontend`; media guidance R3/R4.  
**Specs:** Not located; the supplied audit brief governs.

**Work summary:**

- **Finished —** Inspected markup, CSS, handlers, media references, and fixture metadata. No files, assets, guidance, or notes changed.
- **Next —** Central observer qualification remains pending. Playback, rendered contrast, focus behavior, responsive framing, and loop quality are unverified.

**Next work prompt:** None — follow-up ownership is already assigned.