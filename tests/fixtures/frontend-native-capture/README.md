# Native capture evidence

This fixture validates an app-server transport adapter, not a skill or model outcome. No real model turn was invoked for this leaf. The scripted server is a protocol/process fixture and is never represented as model behavior.

## Interface

`scripts/frontend-native-capture.mjs` exports:

- `executeNative({ prompt, cwd, directory, scenario, executable, referenceImage, expectedControls })`. `directory` must exist; evidence files are created exclusively. `scenario.mode` and `scenario.budget.timeoutMs/maximumImageCalls` have the existing runner meanings. `expectedControls` is an optional frozen five-field comparison binding, never a configuration override; production callers should supply it.
- `readNativeControls()`: reads only model, reasoning effort, sandbox mode, approval policy and approval reviewer from the existing host configuration. Diagnostics do not print configuration contents.
- `probeNativeReadiness({ cwd, directory, executable })`: initialize and create an ephemeral empty thread only. It cannot send `turn/start`.

The caller must bind the explicit executable and adapter/helper hashes before running. The adapter launches `app-server --listen stdio://` in the selected workspace with the existing environment. It uses no alternate home, provider, service, model or permission overrides. It negotiates experimental notifications with no opt-outs. `thread/start` sends only cwd and ephemeral=true; `turn/start` sends the exact prompt/local image input and cwd. Server-returned effective controls must match the five selected configured/frozen fields before any turn. Changes during initialization also block the turn.

The old `exec` source explicitly changed approval policy to Never unless its AutoReview branch applied. Native capture inherits configured on-request/auto_review. Both variants in a fresh comparison must use this same new protocol; old and new trials cannot be pooled or interpreted as a controlled estimate of the transport change. Client originator/session startup also differs from in-process exec. Matching five effective fields does not prove identical hidden context, tool availability, or every possible configuration field.

## Complete capture and conservative interpretation

`raw-stdout.jsonl` retains exact received bytes, including malformed lines. `raw-protocol.jsonl` records every parsed incoming message and outgoing request/notification with direction and elapsed time. `events.jsonl` normalizes every item start/completion, including image_view, imageGeneration with savedPath, dynamic_tool_call, and otherwise unknown items. Each normalized item also preserves its native payload. Command output deltas reconstruct missing aggregated output; present native aggregate output remains authoritative. Usage is preserved natively and mapped to existing snake_case token fields. All native notifications remain recorded; unsupported item methods/types fail explicitly.

`process.json` binds the detached leader PID to boot-id/start-time identity for parent interruption. Tracking/cleanup reuses the reviewed bounded sampler and identity-checked descendant cleanup. Timeout, malformed messages, unfinished items, missing terminal state, thread/turn mismatch, rerouting, unknown item semantics and server requests are retained failures. Server requests are left unresolved; the adapter never grants, escalates, retries, or fabricates answers. The inherited native auto_review policy may independently evaluate requests; its notifications are retained unchanged. That existing policy is not disabled or described as absent.

`toolItems` retains failed/pending calls as well as successful ones, keyed by native item ID. Native image-generation and explicitly named image-tool items count once per ID, regardless of status. Known shell/MCP/dynamic/function-output/delegation operations appear in `unclassifiedToolItems`: their transitive effects require independent review. Function-call output preserves name, namespace and output; its name participates in positive image-tool detection. Named counts are observed protocol-item counts, not proof that differently named wrappers have no image effects or that multiple wrapper IDs cannot refer to one operation. Unknown types/methods fail; ambiguous known tool semantics never automatically certify zero image calls. `userMessage`, context-compaction and review-mode metadata are retained and excluded from tool counts. Known hookPrompt and subAgentActivity items remain explicit unsupported failures because hook/delegated authority and process coverage are not established; their payloads are retained.

`prompt-only` detects any tool item. The parent separately uses `guidance-read-only` with a watcher that allows only an exact, byte-bound guidance read; this adapter does not invent that exception. All authority enforcement is post-observation and cannot prevent a tool that was already dispatched.

Returned imageGeneration savedPath rasters are copied byte-for-byte into `generated-images/`, with native item ID/status, original path, format signature, bytes and SHA256. Missing/invalid/symlink paths remain errors in `savedImages`. This establishes returned file evidence, not image quality or successful generation from a failed item. Image-view path evidence remains in the native item. Counts, paths, dimensions, perceptual quality and provenance require their respective independent checks.

`runtimeFiles` maps literal filenames rather than the old events/stderr aliases. `nativeStreamComplete` concerns observed item lifecycle completeness; it does not certify all transitive tool semantics, universal absence of detached processes, or model quality. `observedModel` is the server-selected model from thread/start, not a cryptographic attestation of backend execution. Model rerouting fails. Full thread response, sandbox/network/root policy and reviewer are archived even though the automated selected-field check covers only the five declared controls.

## Source binding and actual readiness

`bindings.json` binds the installed CLI0.153.4 binary, generated protocol schemas, and official release source at commit3d2ee51ca2d5db578f328aa75e20aa22c0197c9a. Sources are retained with their license. This is a matching release-source association, not a reproducible-build attestation.

Three real initialization-only observations are retained separately:

1. `readiness/default-initialization-failure`: workspace-sandbox startup failed before initialization with read-only runtime state. No thread or turn was started.
2. `readiness/initial-reviewer-rejection`: permitted host execution initialized and created a thread, then the first adapter interpretation rejected inherited auto_review. This was an overly strict helper assumption, not a user requirement. No turn was sent.
3. `readiness/inherited-reviewer-success`: parent clarified that preserving existing controls takes precedence; “no auto-escalation” prohibits adapter-initiated retries/grants, not the inherited host reviewer. Initialization/thread setup succeeds with gpt-6-astra, high, workspace-write, on-request and auto_review. No turn was sent. Later adapter changes added cache_write_input_tokens mapping and explicit current-schema item dispositions; startup/control code is unchanged from this observation. Original observed runner hashes remain intact.

The actual readiness captures sent only initialize, initialized and thread/start (the default failure sent only initialize). There are no usage records or completed model turns. Successful native startup does not demonstrate rendering, image generation or any skill behavior.

## Four verification passes

1. Inspected installed CLI help, matching startup/serializer/persistence source and exact generated schemas; documented native-versus-exec differences and implicit reviewer behavior.
2. Implemented raw/native capture and ran22 scripted controls; retained the log. Added correct inherited reviewer binding and a frozen-reviewer-drift control;23 controls passed.
3. Added native user-message and byte-exact guidance checks; all25 controls passed in `final-test-run.log`. Parent independently reran25 controls. A subsequent mock-only change emits the exact `cat -- 'absolute/path'` contract requested by orchestrator controls; its focused check passes in `exact-guidance-test-run.log`.
4. Audited and archived all three initialization-only captures, confirmed no turn/start requests, preserved errors, and bound final source/test/readiness bytes. Parent identified additional current-schema variants; eight focused transcript controls verify function outputs, metadata and unsupported hook/delegation authority. All33 controls pass together in `final-schema-test-run.log`. Parent semantic/protocol acceptance remains separate from these control results.

The controls cover returned image paths, image views, output deltas, Unicode output, usage, exact prompt/reference input, unknown items/methods, dynamic uncertainty, malformed JSON, missing/failed terminal state, open items, foreign threads, approvals, timeouts, detached descendant cleanup, terminal reconciliation, effective-control drift, readiness with no turn and exclusive evidence creation. Test leftovers under /tmp preserve their raw failure evidence; no fixture child remains running.

Run `node --test tests/fixtures/frontend-native-capture/native-capture.test.mjs` for the scripted controls. Any actual model batch requires its own parent-reviewed freeze; this fixture authorizes none.
