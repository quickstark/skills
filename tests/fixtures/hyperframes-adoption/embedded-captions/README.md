# Installed embedded-caption fixture

This test runs the actual private pipeline on a four-second NASA interview clip.
The supplied timed words identify Nancy Grace Roman; they are editorial captions,
not a claimed verbatim speech transcript. No speech model or external generator
runs. Source attribution, transformation and SHA256 are in `source.json`.

Provision dependencies only with separate explicit authorization, under a dedicated
`/tmp` fixture home. The runner never downloads or installs them. Required existing
resources: HyperFrames 0.8.77, sharp 0.35.4, puppeteer-core 25.12.0, GSAP 3.14.2,
Chromium, FFmpeg/FFprobe, the pinned u2net model, and ONNX Runtime 1.21.1 in the
CLI's exact optional cache. See the skill's runtime compatibility document.

Set `QS_VIDEO_CLI`, `HYPERFRAMES_BROWSER_PATH`, `HF_TEST_USER_DIRECTORY`,
`HYPERFRAMES_FFMPEG_PATH`, `HYPERFRAMES_FFPROBE_PATH`, and FFmpeg's `PATH`/library
path for the selected existing installation. `HF_TEST_USER_DIRECTORY` must be
under `/tmp`. On the reviewed container, only this trusted isolated fixture needs
the explicit process-local `QS_VIDEO_BROWSER_NO_SANDBOX=1`. Ordinary browser
launches remain sandboxed; the helper never enables this option after a failure.

```bash
python3 tests/fixtures/hyperframes-adoption/embedded-captions/run.py --output /tmp/my-caption-fixture --stage prepare
python3 tests/fixtures/hyperframes-adoption/embedded-captions/run.py --output /tmp/my-caption-fixture --stage finish
```

Preparation relocates a complete package, verifies its hashes, proves missing model
and optional runtime rejection before source adoption/network, runs real CPU matte
and safe-zone analysis, and preserves the supplied transcript. Finish compiles the
cream identity, uses real browser previews/layout/gates, renders and composites,
then checks decoded caption timing, source preservation, alpha segmentation, audio
correlation and media dimensions/duration. Actual bad timing, occluded/overflowing
text, missing matte and hidden-caption controls must fail the same strict gates.

Every command's stdout/stderr and exit are retained. Failed attempts remain failed.
The transport guard redirects `os.homedir()` and rejects runtime fetch calls;
runtime freshness and Google Fonts requests may still be attempted and are recorded
separately. This is not proof of zero attempted requests, all caption identities,
speech recognition, arbitrary provider support, or package adoption.
