- [x] Verified — Assess supplied evidence (weight 20%).
- [ ] Pending — Build, launch and observe native focus behavior (weight 80%).

Stage: Native validation | Stage estimate: ~0% | Overall estimate: ~20% | pending — Only source authoring is reported. Input needed: native build/run details and observed interaction results. Estimates cover these two stages, not source quality.

Status: Continuation required
Skills used: /qs-design-prototype
Outcome: No. The prototype cannot be marked complete, and the interaction remains unproven.
Specs: Not located

The intended platform and required runtime are native macOS using the existing SwiftUI app. This fits the hypothesis because command routing depends on native window focus. No runtime has been exercised.

Source written, build verified, rendering observed and interaction observed are separate evidence levels. Only the first is supplied. Even a successful build or screenshot would leave focus-dependent command routing unproven; a browser simulation cannot establish it either. No candidate has an observed verdict or a defensible winning position.

The next required observation is a native run with two distinguishable windows: focus window A and invoke the command, switch focus to B and invoke it again, then switch back and repeat. Record whether each invocation reaches the focused window and leaves the other window unaffected. Apply the same scenario and criteria to every candidate. Preserve the artifact revision, macOS/target details, exact build/run instructions, expected results and actual outcomes. The exact target and invocation are currently missing.

Required checks: Build, launch, rendering and interaction are unobserved; no failed check has been reported.

Work summary:

- Finished — Assessed the supplied evidence boundary. Candidate source is reported at [prototype location](/fixture/prototypes/focus); runnable status is unverified. No artifacts were created or changed.
- Next — [Native command focus prototype](/fixture/prototypes/focus) — pending — build and launch the existing SwiftUI candidates, then capture command routing while switching windows. Keep all prototype code disposable; production promotion remains outside scope.

Next work prompt:
```text
$qs-skills:qs-code-build Validate the existing native command focus prototype at /fixture/prototypes/focus. Source is authored, but no build, rendering or interaction evidence exists. Establish the existing target and exact build/run instructions, then build and launch using the project's SwiftUI runtime. For each candidate, invoke the command in window A, switch focus to B and invoke it, then switch back and repeat. Record expected and actual command recipients, unaffected-window state, artifact revision and environment. Report build, launch, rendering and interaction separately. Preserve alternatives and evidence. Do not promote prototype code, add dependencies or modify production paths. If native execution is unavailable, name the exact prerequisite and leave the hypothesis unproven.
```