# Media recipes

Select R3/R4/R5 through [cinematic landing](cinematic-landing.md) first.
All three share verified footage, a real poster and one lifecycle. Keep meaningful
video in an accessible player with the required alternatives; this example is
for silent decorative footage only. No HLS/CDN dependency is introduced.

## R3 — Background video

**Purpose:** support an explicitly media-led marketing hero.
**Prerequisites:** verified source/rights, browser-supported codec, poster/static
fallback and an accessible pause button outside the decorative layer.
**Parameters:** intersection trigger; muted inline playback; no entrance delay;
poster to playing footage; offscreen/hidden-page pause. Set sources from verified
assets, not invented URLs. An unsupported codec or missing capability stays static.

## R4 — Framing and text protection

**Purpose:** retain subject and readable text as the viewport changes.
**Prerequisites:** inspect actual footage at start/middle/end and the poster.
**Parameters:** `object-fit:cover`, explicit focal point (example 70% center),
mobile crop or in-flow media when cover loses the subject; scrim/solid copy backing
using brand tokens. Crop values and overlay opacity are measured choices.
**Implementation:** apply the same crop to poster and video. Put copy above the
media; overlays use `pointer-events:none`. Prefer moving copy off footage to
fighting a busy mobile crop. Preserve existing colors, fonts, radii and layout.
**Cleanup:** ordinary CSS requires none; remove dynamic style/listener work on unmount.
**Touch/reduced motion/failure:** identical readable static composition; no hover
reliance. Poster and solid backing protect text when video fails.
**Runtime checks:** inspect 375/768/1440 and short landscape for subject, overflow,
focus and actual contrast (4.5:1 normal text, 3:1 large text). Sample moving frames,
not just the poster; verify all controls remain reachable.

## R5 — Loop treatment

**Purpose:** soften a visibly mismatched loop only when natural seamless footage
is unavailable. **Prerequisites:** R3 lifecycle and readable poster beneath footage.
**Parameters:** native loop by default; optional `data-fade-loop`, 180 ms opacity
transition, fade-out lead .3 seconds, immediate restart, no black gap or playlist.
**Implementation:** optional branch below fades to the poster and back on `playing`.
Check several complete cycles before choosing the fade. Very short clips may need
smaller values. **Cleanup/touch/reduced motion/failure:** inherit R3; paused video
returns to the poster, never restarts from a timer or ignores user pause.
**Runtime checks:** inspect both sides of at least three boundaries and repeated
pause/resume, including near the boundary, offscreen and teardown.

## Shared R3/R5 implementation

HTML: a container with `[data-media]`, an ordinary poster `<img alt="">`, a
`<video muted playsinline preload="metadata" aria-hidden="true" hidden>` with a
verified `src`, a `<button type="button" data-pause hidden>Play background video</button>`
and `[data-media-status]` text. Do not use HTML `autoplay`: without JS the poster
must remain static. CSS positions poster/video in the same layer and honors
`[hidden]{display:none}`; copy and button remain above it.

```js
function mountMedia(root) {
  const video = root.querySelector('video');
  const button = root.querySelector('[data-pause]');
  const status = root.querySelector('[data-media-status]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const controller = new AbortController(), options = { signal: controller.signal };
  let observer, dead = false, visible = false, userPaused = false, blocked = false;
  let epoch = 0;
  const still = () => {
    epoch++; video.pause(); video.hidden = true;
    video.style.transition = 'none'; video.style.opacity = '1';
    button.textContent = 'Play background video';
  };
  const sync = async () => {
    if (dead || !visible || userPaused || blocked || reduce.matches ||
        document.hidden) { still(); return; }
    const attempt = ++epoch;
    try {
      await video.play();
      if (attempt !== epoch) return;
      video.hidden = false; button.textContent = 'Pause background video';
      if (status) status.textContent = '';
    } catch {
      if (attempt !== epoch) return;
      blocked = true; still();
      if (status) status.textContent = 'Static preview: playback unavailable.';
    }
  };
  try {
    video.muted = true; video.playsInline = true;
    const fade = video.hasAttribute('data-fade-loop');
    video.loop = !fade;
    button.hidden = false;
    button.addEventListener('click', () => {
      userPaused = !video.paused;
      blocked = false; sync();
    }, options);
    reduce.addEventListener('change', sync, options);
    document.addEventListener('visibilitychange', sync, options);
    video.addEventListener('error', () => {
      blocked = true; still();
      if (status) status.textContent = 'Static preview: media unavailable.';
    }, options);
    if (fade) {
      video.addEventListener('timeupdate', () => {
        if (!video.paused && video.duration - video.currentTime <= .3) {
          video.style.transition = 'opacity 180ms linear';
          video.style.opacity = '0';
        }
      }, options);
      video.addEventListener('playing', () => {
        video.style.transition = 'opacity 180ms linear';
        video.style.opacity = '1';
      }, options);
      video.addEventListener('ended', () => {
        video.currentTime = 0; sync();
      }, options);
    }
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio > 0; sync();
      }, { threshold: [0, .001] });
      observer.observe(root);
    } else {
      if (status) status.textContent = 'Static preview: observation unavailable.';
    }
  } catch { still(); }
  return () => { dead = true; still(); observer?.disconnect(); controller.abort(); };
}
```

**Cleanup:** call the return function on unmount; observer disconnected, listeners
aborted, pending play result invalidated, video paused and hidden. No timers/rAF
survive. **Touch:** native button works by tap and keyboard; never a hover-only pause.
**Reduced motion:** always poster, including a live preference change. Do not let
manual playback override that decorative-motion preference.
**Failure handling:** failed initialization/JS retains poster; rejected autoplay
shows a static limitation and allows a deliberate retry. No-observer stays static.
**Runtime checks:** prove time advances with the actual codec, pause persists across
intersection changes, offscreen/page-hidden pause, failed/rejected media fallback,
reduced-motion poster and zero work after teardown. Unexpected errors block acceptance.

**Upstream source sections:** pinned MotionSites
`faa30d512e3973e58675c72101a7ef42ed37ae83`, plugin skill path
`references/techniques/video-and-media.md` §1 (R3), §§3–4 (R4), §2 (R5).
