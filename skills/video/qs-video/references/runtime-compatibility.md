# Runtime compatibility

Candidate source 2734ee2c02ef858f3c877c18b56ebcfbb846cb4c is paired with
hyperframes 0.8.77 for local validation. Exact package integrities and tested host
versions are in runtime-profile.json. CLI Node requirement is >=22; only Linux
x64 / Node 24.21.0 / Chrome 151 / FFmpeg 6.1.1 has this fixture evidence. Do not claim
other hosts tested. A renderer needs full FFmpeg/FFprobe and compatible Chromium.
The voiceover carve helper additionally requires @hyperframes/core 0.8.77
resolvable from the project or its explicit --core directory. The CLI's bundled
core does not satisfy that import.

The candidate remains inactive until package adoption gates are met. Local
caption/cut/zoom/crossfade/grouped-carve/subcomposition/portrait fixtures passed;
authenticated generation/provider paths remain unverified or unavailable
in the review environment. The specification does not require every provider account;
the parent must identify which unavailable paths are required for the accepted
workflow scope. Successful local provider fixtures do not establish remote readiness. Missing selected provider capability blocks that
outcome. The separate animate-text named recipe catalog is not vendored or
verified. Preserve existing managed capability exposure until replacement gates
pass; this file never waives an acceptance criterion.

Fresh initialization must use the QS scaffold helper. In 0.8.77 the --skip-skills
flag is ignored; HYPERFRAMES_SKIP_SKILLS=1 is the actual runtime switch. The
noninteractive branch returns after scaffold and does not open Studio. Timeline
inspection works from project cwd; advertised positional DIR was rejected.
Media-use's FFmpeg lookup requires binaries on PATH even when renderer-specific
HYPERFRAMES_FFMPEG_PATH/HYPERFRAMES_FFPROBE_PATH are set.

Existing project runtime pins are preserved. Select already-validated instructions
for that pin, or report the compatibility gap before dependent edits. An explicit
upgrade is a separate operation with original-pin backup, check/render evidence,
fixed comparison criteria and rollback readiness; do not rewrite package.json
merely to apply a newer instruction.

Actual frames/audio are required evidence. Draft encoded RGB differs numerically
from PNG snapshots; hue/transition smoke tests do not establish pixel parity or
delivery color fidelity. Synthetic tone carving proves processing and timing,
not perceptual voice intelligibility. Paid/cloud generation, publication and
interactive Studio operation retain their separate authority boundaries.

The installed private media resolver has been executed with the bundled SFX provider and a local warm-daylight grade. Bundled SFX bytes and source provenance matched the private asset; local file ingestion preserved bytes. These checks do not establish credentialed generation, Whisper/Kokoro/MusicGen/Parakeet readiness, Figma authorization or Studio interaction. Required unavailable routes continue to block adoption.

A transitive runtime gap remains in CLI0.8.77's `media-use` local voice provider: its `kokoro.local` branch launches unpinned `npx hyperframes tts`. An injected-executor probe of the published module confirmed that argv without running it. Do not invoke that resolver branch merely because Kokoro is installed; first resolve its pinned-runtime compatibility. The separate QS private audio helper uses the selected CLI, but has not been validated with a complete local voice model. The runtime's mflux path invokes `hf download`; local-only classification does not by itself prohibit tool/model acquisition.

Caption transcription now resolves the selected existing CLI directly, checks CLI0.8.77/project pin and existing Whisper binary/model, explicitly selects the Whisper engine, and preserves already-normalized transcripts. An injected executable verified argv, output conversion, incompatible-pin preservation and missing-model rejection; actual pinned CLI help verified these flags. No speech model ran. The remaining embedded-caption matte/render scripts still contain built-checkout assumptions and unverified model/browser dependencies. Their selected workflow is not proved by the supplied-caption HTML render fixture.
