# Motion recipes

Select R1 or R2 through [cinematic landing](cinematic-landing.md) before loading.
The following optional browser implementation leaves normal HTML visible even if
initialization never completes. Preserve semantic reading order; animate text or
media wrappers, never focusable controls or their ancestors. Do not split accessible
headings into duplicated or reordered text.

## R1 — Entrance choreography

**Purpose:** establish reading hierarchy in an explicitly motion-led hero.
**Prerequisites:** visible semantic HTML, existing tokens and authorized motion.
**Parameters:** load trigger; 0–160 ms sibling delay; 450–700 ms duration;
`cubic-bezier(.22,1,.36,1)`; opacity .75/translateY(14px) to opacity 1/no transform.
Use restrained movement; expensive blur is optional, never a requirement. Controls
remain static and immediately usable. Delayed fonts must not gate visibility or
start an unbounded wait; use existing fallback fonts and measure settled layout.

## R2 — Viewport reveal

**Purpose:** direct attention to selected below-fold content, once.
**Prerequisites:** ordinary document scrolling and optional IntersectionObserver.
**Parameters:** first intersection, threshold 0 (including very tall elements),
zero root margin; 0–160 ms delay; 550 ms duration; same easing and states as R1.
Do not hide awaiting intersection. Unobserve each triggered target and disconnect
when all targets have entered. Unsupported observation simply leaves static content.

## Implementation — R1/R2

Use `data-enter` for R1 and `data-reveal` for R2 on noninteractive wrappers.
`data-delay` is optional milliseconds. No CSS or global `.js` class hides content.

```js
function mountMotion(root) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const controller = new AbortController(), active = new Set();
  let observer, dead = false;
  const finish = () => {
    observer?.disconnect();
    for (const animation of active) animation.cancel();
    active.clear();
  };
  const animate = el => {
    if (dead || reduce.matches || !el.animate ||
        el.matches('a,button,input,select,textarea,[tabindex]') ||
        el.querySelector('a,button,input,select,textarea,[tabindex]')) return;
    const animation = el.animate([
      { opacity: .75, transform: 'translateY(14px)' },
      { opacity: 1, transform: 'none' }
    ], { duration: 550, delay: Math.min(160, Math.max(0,
      Number(el.dataset.delay) || 0)), easing: 'cubic-bezier(.22,1,.36,1)' });
    active.add(animation);
    animation.finished.then(() => active.delete(animation),
      () => active.delete(animation));
  };
  try {
    if (!reduce.matches) {
      root.querySelectorAll('[data-enter]').forEach(animate);
      const pending = new Set(root.querySelectorAll('[data-reveal]'));
      if (pending.size && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
          for (const entry of entries) if (entry.isIntersecting) {
            observer.unobserve(entry.target); pending.delete(entry.target);
            animate(entry.target);
          }
          if (!pending.size) observer.disconnect();
        }, { threshold: 0 });
        pending.forEach(el => observer.observe(el));
      }
    }
    reduce.addEventListener('change', finish, { signal: controller.signal });
  } catch { finish(); }
  return () => { dead = true; finish(); controller.abort(); };
}
```

**Cleanup:** call the returned function on unmount/navigation; it disconnects the
observer, cancels animations and removes the preference listener. Finished animations
leave underlying visible styles, releasing transforms for hover behavior.
**Touch:** no hover dependency, intercepted scrolling or touch handlers.
**Reduced motion:** initial preference skips animation; a live preference change
cancels work into the visible final state. Do not restart reveals afterward.
**Failure handling:** absent JS/WAAPI/observer or partial initialization preserves
visible HTML. An interruption after an animation starts still has its bounded
browser-owned duration. No timer, font promise or observer controls visibility.
**Runtime checks:** inspect early/settled content and visible focus; activate actions
during motion; scroll a target taller than the viewport; scroll away/back to prove
once-only behavior; change motion preference; interrupt initialization and disable
JS; confirm no active animations/observations after teardown and no overflow.

**Upstream source sections:** MotionSites pinned revision
`faa30d512e3973e58675c72101a7ef42ed37ae83`, plugin skill path
`references/techniques/type-and-text-motion.md` sections 1–2 (R1) and
`references/techniques/scroll.md` section 1 (R2). Adaptation avoids upstream's
visibility dependence on a global JS class and keeps controls static.
