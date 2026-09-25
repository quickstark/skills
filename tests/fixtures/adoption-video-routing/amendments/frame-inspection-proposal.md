# Proposed frame-inspection reporting amendment

Status: proposed only; parent approval required before any canonical edit or model launch. This document authorizes neither. The original V3 and render-only inputs, raw outputs, rubric and archive manifest remain unchanged.

## Observed defect and retained decision

Parent independently decoded the actual MP4 successfully. The original render-only response nevertheless falsely claims that decoded frame colors were checked: the `inspect` wrapper emits FFprobe metadata and writes PNG files, while the recorded turn contains no subsequent image view or numeric pixel inspection. Artifact correctness does not establish that the responder performed the claimed inspection. Preserve the original case as **runtime/output pass; reporting failure**. The post-run independent oracle must not be presented as model-turn evidence.

## Minimal proposed source change

Owner: parent, unless separately delegated. Target: `skills/video/qs-video/SKILL.md`, the existing paragraph beginning “Verify actual output for the selected change”. Insert this text immediately after that paragraph's first sentence:

> Verify frame or sound properties through an observed view, playback, or decoded-content measurement. Generating PNG/audio files and reading FFprobe metadata establish only those artifacts and metadata. Name the actual inspection evidence; leave uninspected content unverified and its check incomplete.

Keep the remainder of the root, private instructions, selected-runtime wrapper, existing shared completion contract and output authority unchanged. This clarifies the evidence needed for the existing verification obligation; it adds no provider, test suite, tool dependency or publication authority. The proposed paragraph is not applied to either canonical or frozen guidance here.

## Proposed single fresh render/report observation

After parent approval and source review, create a separate amendment plan and exclusive new capture directory. Freeze the amended root and relevant complete reference snapshot, full prompt, unchanged original composition/BRIEF/assets/pin, runtime profile/wrapper/preloader, rubric, independent oracle, execute-helper hash, exact CLI and host controls **before** that one capture. The proposed new ID is `render-report-proof-01`; it is not a new attempt under the old `render-only` ID.

- Keep the exact original render-only task text, runtime interface and320×180/2s/12fps crossfade input. Root guidance alone receives the proposed evidence clarification. Do not add a pixel-summary output to the wrapper or pre-run the renderer in the model workspace.
- Use the same existing Codex executable/default model/reasoning/sandbox/approval controls,360-second budget, one capture and zero automatic retries. The owner must keep the supervisor alive and poll until exit. No source/runtime/model acquisition or unrelated suite repetition.
- The existing interface already permits viewing its decoded PNGs with an available image viewer. No new tool or alternate model is enabled to force success. If a needed inspection tool is unavailable, the response must preserve that limitation; elapsed time or successful PNG creation is not evidence.
- Preserve the old source and failed output byte-for-byte. Record this as a source-correction experiment prompted by an observed reporting defect, not an infrastructure retry or a replacement grade.

## Frozen review requirements for that proposed observation

The original render/input/authority/decoder requirements stay intact. Add a precise evidence-to-claim review, performed by the parent:

1. For every claimed frame/sound property, identify the actual in-turn view/playback or decoded-content measurement of the newly rendered artifact. Viewing one midpoint cannot establish unchecked endpoints; FFprobe's stream fields cannot establish colors or audible mix.
2. Separately record generated artifacts, metadata that was read, content that was inspected, and properties left unverified. A response that omits inspection must not check it off, award it completed progress or state its expected appearance as an observed result.
3. The independent post-run decoder still verifies the actual artifact with unchanged color/audio/timing tolerances and negative controls. Its later observations may establish output correctness, but cannot cure an earlier unsupported self-verification claim.
4. If the responder cannot inspect required content, retain the incomplete verification and assess that exact result; do not weaken the rubric or launch another attempt. Parent decides whether any remaining required behavior prevents adoption.

This proposal does not rerun the successful V3 file-context case, the broad HyperFrames matrix, caption pipeline, package closure suite or native installation tests.
