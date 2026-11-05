# Prototype platform instruction trials

These scoped response-only trials exercise platform/subject selection, proportional evidence, missing native tooling and authority boundaries for `qs-design-prototype`. They do not execute a browser or native Mac prototype and make no runtime, efficiency or universal compliance claim.

`scenarios.json` contains synthetic user requests, observed project facts and a separate review rubric. The rubric and acceptance IDs are withheld from responders. The runner reuses the existing response-only prompt builder, canonical output-contract rendering and bounded capture supervisor. Each case starts with the root only, requests its own private references, and receives exact frozen content. Each Codex invocation uses a fresh temporary working directory and `--ephemeral`, with unchanged model/settings and no model override. Round prompts carry the complete synthetic state; this does not measure a persistent conversation's reference-loading cost.

Run a new attempt with `node scripts/prototype-platform-trials.mjs tests/fixtures/prototype-platform/run-03`, choosing an unused `run-N` directory. Maximum three rounds per case, one attempt per case within each run, two concurrent cases. Preserve failed attempts; corrections require a new run rather than rewriting responses.

The existing Codex CLI needs access to its session-state directory. A read-only sandbox can prevent startup even for a response-only task; record that as infrastructure failure and use authorized normal session-state access for a separate attempt. Do not change model/settings or claim a startup failure is a behavioral result. The imported supervisor detects tool events after dispatch; it is not a pre-execution security boundary.

Each run retains frozen sources and scenarios, source/derived hashes, CLI identity, exact prompts, raw events, responses, telemetry, selected references and an artifact manifest. Transport success is separate from semantic review. Review each response against the withheld scenario expectations and record source-bound judgments independently before claiming acceptance. Missing runtime model telemetry stays unverified.
