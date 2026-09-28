> Private QS video module. Read [the owning root policy](../../references/adaptation-policy.md) before applying mechanics. This module has no independent invocation, result, or authority. Named modules resolve through the dependency index; upstream examples never authorize dependency installs, account setup, project upgrades, publication or delegation.


# HyperFrames entry point

HyperFrames **renders video from HTML** — a composition is an HTML file whose DOM declares timing with `data-*` attributes, whose animation runtime is seekable, and whose media playback is owned by the framework. The full authoring contract lives in [hyperframes-core](../hyperframes-core/instructions.md); read it before writing composition HTML. Brief, storyboard, review, production, dispatch, and frame-worker contracts live in this skill's `references/`.

## 1. Start from project state

Apply the first matching row; do not evaluate lower state rows:

| State                                                                                                                         | Action                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explicit port of existing Remotion source to HyperFrames                                                                      | Read `references/routes/remotion-to-hyperframes.md`, then route directly to that workflow. Skip the intent layer.                                                                                                                      |
| Specific operation on an existing HyperFrames project: inspect, diagnose, validate, preview, render, publish, or batch-render | Perform only that operation. Skip intent and workflow routing; load [hyperframes-cli](../hyperframes-cli/instructions.md) and any required domain skills.                                                                                                                 |
| Specific edit to an existing project                                                                                          | Make the edit. Do not run the intent layer. To know what is on a project's timeline (tracks, clips, starts, ends, what plays), run `"$QS_VIDEO_CLI" timeline [--json] (from the project directory)` instead of reading `index.html` and every sub-composition file. |
| `BRIEF.md` exists                                                                                                             | Read `workflow` and `flow`. Execute that workflow; `flow: companion` always executes in [general-video](../general-video/instructions.md). Ask no brief questions.                                                                                                      |
| No brief, but `hyperframes.json` or `STORYBOARD.md` exists                                                                    | Resume from project files and recorded preferences. Infer the owning workflow from existing artifacts. If it cannot be determined uniquely, ask one routing-only question; do not run the intent interview.                            |
| Fresh creation                                                                                                                | Run the intent layer — `references/intent-interview.md` — then route once using § 2's table.                                                                                                                                           |

<!-- history (trial): remove this block together with the command -->

When you edit an existing project, bracket your edits with project history ([hyperframes-cli](../hyperframes-cli/instructions.md), Project history in your turn).

<!-- /history (trial) -->

If a fresh request does not identify the subject or input, ask what the video is about before routing. Check preferences and recipes before asking anything (`references/intent-interview.md`, step 1). A `figma.com` input or a named recipe changes intake, not routing — the interview's "Adapt orthogonal inputs" section handles both.

### Keep the project's CLI compatible

Read the recorded project pin and this package's runtime compatibility profile. Continue on a supported existing pin. Missing compatibility evidence blocks the affected operation; do not probe latest and upgrade automatically. A separately authorized upgrade needs backup, actual check/render comparison and recovery readiness. New scaffolded projects use the QS scaffold helper with the tested runtime.

## 2. Route fresh creation

Use the first matching row. Match the requested **deliverable**, not a word or file type mentioned in passing.

| Priority | Request                                                                                                            | Workflow                   |
| -------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| 1        | Explicitly port an existing Remotion source                                                                        | [remotion-to-hyperframes](../remotion-to-hyperframes/instructions.md) |
| 2        | Author a presentation, pitch deck, or navigable interactive deck                                                   | [slideshow](../slideshow/instructions.md)               |
| 3        | Add plain captions or subtitles to existing talking-head footage without changing it                               | [embedded-captions](../embedded-captions/instructions.md)       |
| 4        | Add designed graphic overlays to existing talking-head, interview, or podcast footage without changing the footage | [talking-head-recut](../talking-head-recut/instructions.md)      |
| 5        | Build a beat-synced video from a music track, with no narration or website capture                                 | [music-to-video](../music-to-video/instructions.md)          |
| 6        | Create an explicitly short, unnarrated, motion-first unit, typically under 10s                                     | [motion-graphics](../motion-graphics/instructions.md)         |
| 7        | Explain a GitHub pull request or code change from a PR reference                                                   | [pr-to-video](../pr-to-video/instructions.md)             |
| 8        | Market or showcase a website, product site, app, or company from a URL or site-specific brief                      | [product-launch-video](../product-launch-video/instructions.md)    |
| 9        | Explain a topic, article, or notes with invented visuals and no product or site capture                            | [faceless-explainer](../faceless-explainer/instructions.md)      |
| 10       | Any other custom video or composition                                                                              | [general-video](../general-video/instructions.md)           |

Before finalizing the route, read `references/routes/<workflow>.md` — one small file per route: the canonical input/output/trigger contract (resolved from this package before dependent authoring) plus that route's interview entry. If the candidate does not satisfy its contract, continue routing instead of forcing the match. Read only the matched route's file.

### Resolve common ambiguities

- A short animated title, logo sting, stat hit, chart hit, map hit, or standalone lower-third is [motion-graphics](../motion-graphics/instructions.md) when it is unnarrated and motion is the message. A static title card, narrated sequence, longer montage, or custom loop is [general-video](../general-video/instructions.md).
- An explicitly short motion graphic may use a URL, tweet, article, or screenshot as source material. A generic "make a video from this site" request is [product-launch-video](../product-launch-video/instructions.md).
- Existing footage with captions routes to [embedded-captions](../embedded-captions/instructions.md); footage with designed information cards routes to [talking-head-recut](../talking-head-recut/instructions.md). Retiming, reordering, recoloring, reframing, or remixing footage is a custom edit and falls through to [general-video](../general-video/instructions.md).
- A music file selects [music-to-video](../music-to-video/instructions.md) only when its beat grid drives the piece. Music used as a bed does not override the subject-matched route.
- "I want a storyboard" changes the review process, not the workflow. With no other routing signal, use [general-video](../general-video/instructions.md). A confirmed sketched `storyboard.html` may itself be the requested deliverable; the review loop defines that stop point.
- Specialized narrative workflows support up to about 3 minutes and are strongest around 30–90s. Route a clearly longer piece to [general-video](../general-video/instructions.md). Length never overrides an explicit port, deck, caption, overlay, or music-driven deliverable.

## 3. Route once, then leave

For fresh creation the intent layer (`references/intent-interview.md`) runs the full conversation — memory, triage, pitch round, must-haves, run-shape, hand-off — and **ends by writing `BRIEF.md`. The brief is the only routing artifact the workflow reads**; nothing later re-opens this skill or the interview. Answer every later "what did the route require?" from `BRIEF.md`.

## 4. Resolve and enter the private workflow

Find the selected workflow in the root dependency index, verify its required files, then read its instructions. Missing or incompatible files stop dependent authoring. No skill download, install, refresh or fallback public invocation is allowed. The QS root remains the only public owner.

## 5. Load domain skills on demand

| Need                                                                                                                                        | Skill                    |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Composition structure, timing attributes, tracks, variables, determinism                                                                    | [hyperframes-core](../hyperframes-core/instructions.md)      |
| Motion rules, scene blueprints, transitions, runtime adapters                                                                               | [hyperframes-animation](../hyperframes-animation/instructions.md) |
| Seek-safe GSAP, CSS, Anime.js, WAAPI, FLIP, paths, masks, SVG, 3D keyframes, or `hyperframes keyframes` diagnostics                         | [hyperframes-keyframes](../hyperframes-keyframes/instructions.md) |
| Design specs, concept, palette, typography, narration, beat planning                                                                        | [hyperframes-creative](../hyperframes-creative/instructions.md)  |
| Images, icons, logos, audio, captions, grades, LUTs, reusable media                                                                         | [media-use](../media-use/instructions.md)             |
| Voiceover carve, audio effect chains, automation envelopes, or one chain/fader across several tracks (submix bus)                           | [hyperframes-audio](../hyperframes-audio/instructions.md)     |
| Init, lint, check, snapshots, compare, batch render, Studio, render, publish, or diagnostics                                                | [hyperframes-cli](../hyperframes-cli/instructions.md)       |
| Registry blocks and components                                                                                                              | [hyperframes-registry](../hyperframes-registry/instructions.md)  |
| A named look, effect, treatment, or transition — CRT scanlines, glitch, film grain, shimmer sweep, confetti burst — BEFORE hand-building it | [hyperframes-registry](../hyperframes-registry/instructions.md)  |
| Figma assets, tokens, components, or storyboard frames as reconstructed motion                                                              | [figma](../figma/instructions.md)                 |

Creator edit phrases are cross-domain requests. Load every skill named in the matching row:

| Creator request                                                                                                    | Required domains                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “cut this footage”, hard cut, trim, splice, reorder, or use a source range                                         | [general-video](../general-video/instructions.md) + [hyperframes-core](../hyperframes-core/instructions.md); core owns `data-start`, `data-duration`, `data-media-start`, and track layout.                                                            |
| zoom in here, punch-in / punch-out, smooth multi-state zoom or reframe, Ken Burns, or camera move                  | [general-video](../general-video/instructions.md) + [hyperframes-core](../hyperframes-core/instructions.md) + [hyperframes-keyframes](../hyperframes-keyframes/instructions.md); animate the inner visual/crop wrapper, not the timed clip.                                                     |
| match cut or whip pan camera transition                                                                            | [general-video](../general-video/instructions.md) + [hyperframes-animation](../hyperframes-animation/instructions.md) + [hyperframes-keyframes](../hyperframes-keyframes/instructions.md) + [hyperframes-registry](../hyperframes-registry/instructions.md); search/install a transition primitive before hand-authoring.                    |
| fade, crossfade, track gain/volume, automation, duck/carve, audio effects, or one effect across several tracks     | [general-video](../general-video/instructions.md) + [hyperframes-core](../hyperframes-core/instructions.md) + [hyperframes-audio](../hyperframes-audio/instructions.md); core places clips, audio mixes placed tracks — including a submix bus over a group of them.                        |
| picture and sound edits that combine cuts with camera motion or mixing                                             | [general-video](../general-video/instructions.md) + [hyperframes-core](../hyperframes-core/instructions.md) + [hyperframes-keyframes](../hyperframes-keyframes/instructions.md) when there is visual motion + [hyperframes-audio](../hyperframes-audio/instructions.md) when sound is faded, mixed, ducked, automated, or processed. |
| lay out a project so it reads well in Studio: caption track, tracks per element kind, sub-compositions, safe zones | [hyperframes-studio](../hyperframes-studio/instructions.md) + [hyperframes-core](../hyperframes-core/instructions.md); studio owns the layout conventions, core owns each edit.                                                                             |
| source or generate media, or preprocess an unsupported mid-source freeze                                           | [media-use](../media-use/instructions.md); sourcing/generation/preprocessing only, never placed-track mixing.                                                                                                  |

Constant `data-playback-rate` is render-safe for picture and pitch-preserved
sound. Speed ramps are a `rate` lane in `data-automation`.
For copyable edit contracts, load [hyperframes-core](../hyperframes-core/instructions.md) → `references/creator-editing-recipes.md`.

Broad feedback about how photographic media looks or behaves also routes to
[media-use](../media-use/instructions.md), even when the user never says “color grading” or “effect”: fix
dark/flat/boring footage, stylize a clip, hide a face, or improve a media
reveal. Read `../media-use/references/media-treatments.md` before editing a
treatment; it governs how footage is treated, never whether media may be used.
Do not substitute a generic LUT, CSS filter/overlay, or opacity tween for an
existing canonical treatment primitive. Keep text/layout/motion-only edits in
their owning domain.
During a build with important photographic media, include one grounded
media-polish scan in the final quality pass; leaving suitable media unchanged is
a valid result.

Domain skills never take ownership of the end-to-end deliverable. Load only what the active workflow needs.
