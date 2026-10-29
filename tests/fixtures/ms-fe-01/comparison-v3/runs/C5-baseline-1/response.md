I’ll read the selected guidance and inspect `index.html` for motion, media accessibility, and framing issues. I won’t edit files or run browser checks.

I’m using the selected local `qs-design-frontend` guidance for this audit.

- [ ] Active: inspect source and relevant guidance.
- [ ] Pending: report findings and runtime uncertainties.

Stage: Source audit | Stage estimate: ~60% | Overall estimate: ~60% | Continuing — the source shows an infinite CTA animation and a video reference to `missing.webm`. Input needed: none.

The source shows uncontrolled CTA motion, an intentionally unresolved video, and no explicit cinematic framing. **Playback and rendered behavior remain unverified.** No files were changed.

Findings from [index.html](/tmp/ms-fe-01-v3-C5-baseline-1/index.html:1), in priority order:

1. **The primary CTA repeatedly fades almost away.** `.cta` runs `pulse 2s infinite`, reaching `opacity: .1`, including its text. There is no reduced-motion override or pause mechanism. This undermines readability and makes the navigation target visually unstable. Keep the label opaque and provide a static reduced-motion state.

2. **The missing media has no useful fallback.** The video references `missing.webm`, which is absent locally. It has no `poster`, fallback content, or error handling. The verified fixtures `assets/scene.webm` and `assets/poster.svg` exist but are unreferenced. Because the missing source is intentional, this is a fallback-design finding; actual failure presentation was not observed.

3. **Video playback has no user control.** The element requests `autoplay loop` without `controls`, a custom pause control, or reduced-motion handling. It also omits `muted` and `playsinline`. These omissions do not establish that autoplay succeeds, that sound plays, or how mobile playback behaves—especially with the source missing.

4. **The video’s accessibility role is undefined.** The markup does not establish whether the film is decorative or conveys essential information. Decorative media should avoid redundant assistive-technology exposure; meaningful media needs an accessible description and alternatives appropriate to its audio and visual content. Caption requirements cannot be determined from this unresolved source.

5. **Cinematic framing is unspecified.** The video appears before the headline, with no width, height, aspect ratio, responsive sizing, or `object-fit` rules. Its occupied space and crop are left to browser defaults or media metadata. Narrow-screen overflow and the balance between film and headline require observer verification. Define the intended frame and preserve essential imagery when choosing cropping.

6. **Two additional accessibility gaps are visible.** The document lacks `lang="en"`. The details button toggles the paragraph’s `hidden` property without updating `aria-expanded` or declaring `aria-controls="detail"`, leaving its expanded state uncommunicated.

- [x] Verified: selected guidance and source inspection.
- [x] Verified: audit findings delivered.

**Status:** Complete — bounded source audit.  
**Skills used:** Local `qs-design-frontend`.  
**Specs:** Not located; scope supplied in your request.  
**Work summary:** Finished — read-only audit; no implementation or notes edits. Next — central observer owns browser qualification and independent quality review.  
**Next work prompt:** None — observer workflow already assigned.