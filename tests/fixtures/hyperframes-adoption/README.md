# HyperFrames adoption runtime fixtures

These fixtures exercise published **hyperframes0.8.77** on Linux with external
Node, Chromium, FFmpeg/FFprobe, GSAP and a local font. They install nothing. Each
run requires a new output directory; generated WAV/MP4/PNG files and raw logs stay
there. Source fixtures consist of deterministic HTML, SVG, tones and video colors
created by the harness. No copyrighted footage, credentials or generated images
are included.

Set these variables to existing files before running `python3 run.py --output
/tmp/hf-matrix-<unique-id>` from this directory:

| Variable | Existing dependency |
| --- | --- |
| HF_CLI | hyperframes package CLI executable, exactly0.8.77 |
| HF_FFMPEG / HF_FFPROBE | Full binaries supporting libx264, AAC, PCM and raw RGB |
| HF_BROWSER | Compatible Chrome headless shell |
| HF_GSAP | Local GSAP3.14.2 dist/gsap.min.js |
| HF_FONT | Local DejaVuSans.ttf used by the fixture's embedded font |
| HF_CARVE | Reviewed private hyperframes-audio/scripts/carve.mjs |
| HF_CORE_ROOT | Directory resolving separately installed @hyperframes/core0.8.77 |

The CLI bundles core internally; that does not satisfy carve.mjs's separate
module-resolution dependency. If FFmpeg uses libraries outside system paths,
configure its library search path explicitly before running. The harness neither
changes an existing video project's dependency pin nor downloads tools.

The six cases render actual MP4 files and assert independent observations:

- Caption appearance only within its declared interval, with unchanged footage
  outside the caption band.
- Hard cut between distinct source videos, zoomed marker geometry and repeated
  backward seek equality.
- Crossfade endpoints/midpoint, opposing audio frequency envelopes and shuffled
  seek repeatability.
- Subcomposition template mounting, local SVG/font resources, animation, and a
  missing-resource check that must fail after the positive render.
- Portrait output dimensions plus expected center/border content.
- Real carve helper analysis against a voice group containing late narration,
  rendered audio spectral change and rejection of a no-op mix control.

Snapshots use exact authored RGB expectations. Decoded **draft** MP4 assertions
check dominant hues and blend state, recording measured RGB; encoding/color
conversion changes numerical RGB compared with PNG snapshots. These thresholds
are semantic checks, not a visual-parity tolerance, perceptual sound approval or
proof of delivery-quality color. No original reference/tolerance in a parity
workflow may be changed on this basis. Tone-based carve checks establish that
processing happened in the relevant interval; they do not establish human voice
intelligibility.

`python3 operations.py --output /tmp/hf-operations-<unique-id>` runs the separate
operation matrix with the same CLI/browser/FFmpeg variables. Its declared Node
preloader redirects **only this test process's** os.homedir() to a synthetic user
directory, including the spawned media helper, and refuses every fetch. It also
contains a defensive stop before interactive preview. The expected
`init --example blank --non-interactive` path returns normally without preview;
`HYPERFRAMES_SKIP_SKILLS=1` prevents skill refresh. The CLI's `--skip-skills` flag
alone is ignored at this version.

Operation assertions cover preserved BRIEF/old package pin during timeline
inspection; local WAV ingest with exact bytes and local provenance; rejected
zero-byte ingest; a stale, fixture-seeded offline catalog; explicit diagnostics
for an unsearchable Japanese word-tier query; failed uncached-item installation
without a false installed artifact; and absence of intentional feedback/skill
body downloads. This is an instrumented unavailable-network scenario, not proof
of an authenticated provider or a full network sandbox. Runtime version/skill
manifest freshness fetch attempts are retained in the network log. Local SVG
ingestion intentionally sanitizes SVG bytes, so exact-byte preservation is
asserted on a WAV rather than incorrectly demanded for sanitized SVG.

The source does not exercise paid generation, cloud render, publication, OAuth,
real Studio startup or other OS runtimes. It does not replace the separate
agent-routing, private dependency-closure, installed-package, perceptual media or
provider compatibility gates in the adoption specification. A missing required
provider remains a package-adoption blocker.
