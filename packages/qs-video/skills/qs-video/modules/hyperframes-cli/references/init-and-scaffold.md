# Fresh scaffold and selected website capture

Use the root scaffold helper with an existing verified CLI0.8.77. It requires an existing parent and an absent/empty target. Initialization happens in an isolated sibling staging directory with noninteractive mode, skip-transcription and upstream refresh disabled. The helper rewrites only staged instructions, revalidates the destination after init, and exclusively creates output files. A concurrent change fails without overwriting competing guidance; staged diagnostics remain available.

```bash
node "$QS_VIDEO_DIR/scripts/scaffold.mjs" --cli "$QS_VIDEO_CLI" -- my-video --example blank
node "$QS_VIDEO_DIR/scripts/scaffold.mjs" --cli "$QS_VIDEO_CLI" -- my-video --resolution portrait
node "$QS_VIDEO_DIR/scripts/scaffold.mjs" --cli "$QS_VIDEO_CLI" -- my-video --video clip.mp4
node "$QS_VIDEO_DIR/scripts/scaffold.mjs" --cli "$QS_VIDEO_CLI" -- my-video --audio track.mp3
```

Supported options: `--resolution`, `--skill` (record a private workflow ID), `--video`, `--audio`, `--example blank`, `--non-interactive`, `--skip-skills`, `--skip-transcribe`. Supplied media is copied; transcription is a separate operation with verified local dependencies/provider authority. The runtime ignores `--skip-skills`; the helper sets `HYPERFRAMES_SKIP_SKILLS=1` instead.

Other upstream mechanisms are preserved as compatibility references: examples `warm-grain`, `play-mode`, `swiss-grid`, `vignelli`, `decision-tree`, `kinetic-type`, `product-promo`, `nyt-graph` and Tailwind v4 initialization need an explicitly selected template operation with verified resources. They are not accepted by this bounded blank-scaffold helper. Read [core](../../hyperframes-core/instructions.md) for Tailwind mechanics. Existing projects keep their pin, BRIEF and instruction files.

Resolution presets include landscape, portrait, square and their `-4k` forms. The fixture profile verifies only the recorded landscape and portrait outputs; other formats need their own check.

## capture

```bash
"$QS_VIDEO_CLI" capture https://stripe.com                  # scaffold from a website
"$QS_VIDEO_CLI" capture https://linear.app -o linear-video  # custom output directory
"$QS_VIDEO_CLI" capture https://example.com --json          # JSON output for agents
"$QS_VIDEO_CLI" capture https://example.com --skip-assets   # skip image/SVG download
"$QS_VIDEO_CLI" capture https://example.com --skip-vision   # skip optional AI captions
"$QS_VIDEO_CLI" capture https://example.com --max-screenshots 12
"$QS_VIDEO_CLI" capture https://example.com --timeout 60000 # page-load timeout in ms
"$QS_VIDEO_CLI" capture https://example.com --capture-budget 90000 # post-navigation budget
```

Captures a live URL as an editable HyperFrames project: screenshots become layered scenes, assets are downloaded locally, and the result is a normal project you can `lint` / `preview` / `render`. Use this when the user supplies a URL as the starting point for a video.

`--timeout` bounds page navigation; `--capture-budget` is the separate cooperative budget for work
after navigation (fonts, assets, vision, and contact sheets). The latter is not a hard wall-clock
watchdog and cannot interrupt native work already in flight. An outer caller deadline is therefore a
third, distinct timeout. An outer caller timeout leaves the capture result unknown; it does not prove
HyperFrames hung or that the navigation timeout should be increased. Preserve the last phase and
classify the boundary that fired. `--skip-vision` disables only optional AI image captioning.

For agents, use `--json`. The result includes `ok`, warnings, and `lastPhase`. The command also emits
stable `HYPERFRAMES_CAPTURE_PHASE` records so a watchdog can report the last started, completed, or
degraded phase without retaining sensitive payloads.

Treat a non-zero exit, JSON `ok: false`, or an output `BLOCKED.md` as a **hard stop**. Do not render,
build, or infer brand/design data from partial files in a blocked capture. A successful capture may
degrade an optional phase within budget, but its structural output still has to satisfy the owning
workflow's gate. Exit zero and file existence alone are not semantic success: require the current
invocation's JSON `ok: true`, no `BLOCKED.md`, and artifacts usable for that workflow. Run each retry
into a fresh output directory; never merge or reuse a blocked attempt's partial output.

## Private instructions

Resolve workflow/domain resources through the QS dependency index. Missing resources stop dependent work. Do not run an upstream installer or refresh to repair them.
