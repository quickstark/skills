# Requirements & Caches

## Credential & key priority

Run `"$QS_VIDEO_CLI" auth status` to see what's configured and which engines a workflow will use (see the skill's **Preflight** section). Keys resolve in this order — **first match wins**:

| Provider                             | Resolution order (first non-empty wins)                                                                                                                                    | Local deps when used                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **HeyGen** (TTS + BGM/SFX retrieval) | `$HEYGEN_API_KEY` → `$HYPERFRAMES_API_KEY` → `~/.heygen/credentials` (shared with heygen-cli; `$HEYGEN_CONFIG_DIR` overrides the dir; written by `hyperframes auth login`) | none (REST)                                      |
| **ElevenLabs** (TTS fallback)        | `$ELEVENLABS_API_KEY`                                                                                                                                                      | `pip install elevenlabs`                         |
| **Lyria** (BGM fallback)             | `$GEMINI_API_KEY` → `$GOOGLE_API_KEY`                                                                                                                                      | `pip install google-genai`                       |
| **Kokoro** (TTS, no key)             | only when selected and dependencies/models are already verified                                                                                                                                              | `pip install kokoro-onnx soundfile`              |
| **MusicGen** (BGM, no key)           | only when selected and dependencies/models are already verified                                                                                                                                              | `pip install transformers torch soundfile numpy` |

`hyperframes auth login` (browser OAuth) is the recommended setup: one sign-in, every project, no per-repo `.env`. An OAuth login is sent as `Authorization: Bearer`; an API key as `X-Api-Key`; both are tagged with `X-HeyGen-Source: cli`. OAuth CLI users can consume the web-plan free allowance for HeyGen TTS (10 min/month); API keys follow the normal API billing path. With no HeyGen credential, local voice/BGM are possible only if the selected Kokoro / MusicGen dependencies and models are already available — `hyperframes auth status` and `hyperframes doctor` both report whether those local deps are installed.

## Model caches & system dependencies

Upstream commands can download models or build tools on first use. Before invoking one, verify its complete local prerequisites; do not execute an unprepared route merely to discover what it downloads. Installation/model acquisition is a separate authorized setup operation. Cache locations and dependency mechanisms:

- **TTS (HeyGen)** — no local deps; needs a HeyGen credential + `ffmpeg` on PATH (to transcode the mp3 response to `.wav`). Credential resolves like the CLI: `$HEYGEN_API_KEY` → `$HYPERFRAMES_API_KEY` → `~/.heygen/credentials` (shared with heygen-cli; run `"$QS_VIDEO_CLI" auth login`). An OAuth login is sent as `Authorization: Bearer`; an API key as `X-Api-Key`; both include `X-HeyGen-Source: cli` so the backend can apply CLI OAuth free usage.
- **TTS (ElevenLabs)** — same as HeyGen: API key + `ffmpeg`.
- **TTS (Kokoro)** — Kokoro-82M (~311 MB) + voices (~27 MB) in `tts/`. Requires Python 3.8+ with `kokoro-onnx` and `soundfile` (`pip install kokoro-onnx soundfile`). Non-English text also needs `espeak-ng` system-wide.
- **BGM (Lyria)** — needs `$GEMINI_API_KEY` or `$GOOGLE_API_KEY` + `pip install google-genai`. No local model cache.
- **BGM (MusicGen)** — `pip install transformers torch soundfile`. `facebook/musicgen-small` (~300 MB) cached under `~/.cache/huggingface/` on first run.
- **Transcribe** — Whisper model size depending on choice (75 MB – 3.1 GB) in `whisper/`, downloaded from HuggingFace on first use. `whisper.cpp` itself is NOT bundled: the CLI resolves it from PATH, installs via Homebrew (macOS), or builds it from source with git+cmake on first use (`$HYPERFRAMES_WHISPER_PATH` overrides).
- **Remove-background** — `u2net_human_seg` (~168 MB ONNX) in `background-removal/models/`. Peak inference RAM ~1.5 GB.

Run `"$QS_VIDEO_CLI" doctor` if a command fails because of a missing dependency.
