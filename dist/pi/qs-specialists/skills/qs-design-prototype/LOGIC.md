# Logic prototype reference

Use inside the selected prototype root when the question concerns business rules, state transitions or data shape. Load [UI.md](UI.md) alongside this reference when visual or interaction alternatives also matter. Subject and platform selection belong to the root; this is a conditional reference, not another public run.

## State the question and choose the shell

State the hypothesis, valid/invalid states, candidate criteria and known initial state before authoring. Choose the shell after deciding whether native behavior matters. For a non-developer evaluating platform-independent state behavior, prefer a self-contained HTML/CSS/JavaScript demo that opens locally without installation when it can answer the question. For a terminal-oriented or runtime-specific question, use the project's existing language and a small CLI/TUI. When the hypothesis depends on native controls, menus, windows or focus, use the existing native runtime and the root's selected platform guidance; HTML or CLI output cannot establish that behavior. Do not add a runtime, package manager or framework merely for the shell.

Keep the demo under an isolated, selected prototype path. Existing production entry points, scripts or configuration are outside scope unless their modification was explicitly included. Show the exact local open/run instruction; do not publish or send the artifact to anyone automatically.

## Separate rules from presentation

Express the rules as a small reducer, state machine or pure function module with no DOM, native UI, terminal or database effects. A shell dispatches actions through its public interface and renders the returned state. Use in-memory fixtures; access a real service only when the question and authority specifically require it. Portability makes the model easier to test, but does not make the prototype production-ready.

Use domain terms for actions and fields. Display relevant state, an explanation of the last change and available actions. Include free play plus reproducible scenarios: a valid path, an awkward boundary and an attempted invalid transition. Reset before each guided scenario. An illegal action must show why it is rejected and leave the appropriate state unchanged; silently disabling every difficult action hides the hypothesis.

Evaluate each candidate against the same criteria. Exercise the selected scenarios, and add a small automated check when it materially proves the disputed rule; there is no blanket ban on prototype tests. Avoid unrelated hardening or generalization.

## Record the decision without promotion

Preserve the candidates, run/open instructions, observed states and decision rationale at the selected prototype location. Identify what failed or remains unproven. The model and shell remain disposable evidence: do not lift the logic into production or modify real routes automatically. Cleanup covers only authorized, run-owned disposable artifacts after necessary evidence is retained; leave unrelated work intact.
