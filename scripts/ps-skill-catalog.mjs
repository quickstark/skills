export const PS_COLLECTION = Object.freeze({
  id: "ps",
  name: "Pstack Skills",
  packageName: "ps-skills",
  codexPlugin: "ps-skills",
  claudePackageRoot: "packages/ps-skills",
  codexPackageRoot: "codex/plugins/ps-skills",
  canonicalRoot: "skills/pstack/commands",
  documentationRoot: "docs/pstack",
});

export const PS_UPSTREAM = Object.freeze({
  repository: "https://github.com/cursor/plugins",
  subdirectory: "pstack",
  version: "0.14.1",
  commit: "63d938c2e4a165a0fec1bd0f61a8e325f0cb751e",
  author: "Lauren Tan",
  license: "MIT",
  copyright: "Copyright (c) 2026 Lauren Tan",
});

const EFFORT_POLICY = Object.freeze({
  supported: Object.freeze(["quick", "standard", "deep"]),
  default: "standard",
});

const REPORT_POLICY = Object.freeze({
  supported: Object.freeze(["brief", "full"]),
  default: "brief",
});

const COMMAND_DEFINITIONS = Object.freeze([
  Object.freeze({
    name: "ps-help",
    group: "help",
    position: 10,
    displayName: "PS Help",
    shortDescription: "Choose the right PS or QS workflow",
    prompt: "choose the right PS or QS workflow for the requested outcome",
    outcome: "Select one PS or QS workflow from the user's desired outcome",
    mutationBoundary: "Read-only",
    candidateId: null,
  }),
  Object.freeze({
    name: "ps-how",
    group: "understand",
    position: 20,
    displayName: "PS How",
    shortDescription: "Explain how a selected subsystem works",
    prompt: "explain how the selected subsystem works from code and observed interfaces",
    outcome: "Explain how a selected subsystem actually works from code and observed interfaces",
    mutationBoundary: "Read-only",
    candidateId: "skill:how",
  }),
  Object.freeze({
    name: "ps-why",
    group: "understand",
    position: 30,
    displayName: "PS Why",
    shortDescription: "Explain why a behavior or design exists",
    prompt: "explain why the selected behavior or design exists from attributable evidence",
    outcome: "Explain why a behavior or design exists from attributable evidence",
    mutationBoundary: "Read-only",
    candidateId: "skill:why",
  }),
  Object.freeze({
    name: "ps-blast-radius",
    group: "understand",
    position: 40,
    displayName: "PS Blast Radius",
    shortDescription: "Map the impact of one proposed change",
    prompt: "map callers, contracts, data, tests, and operations affected by this proposed change",
    outcome: "Map affected callers, data, interfaces, tests, and operational surfaces around one proposed change",
    mutationBoundary: "Read-only",
    candidateId: "skill:blast-radius",
  }),
  Object.freeze({
    name: "ps-runtime-forensics",
    group: "diagnose",
    position: 50,
    displayName: "PS Runtime Forensics",
    shortDescription: "Diagnose one live runtime symptom",
    prompt: "diagnose this live runtime symptom from actual measurements without repairing it",
    outcome: "Diagnose one live runtime symptom from actual measurements",
    mutationBoundary: "Diagnosis only; temporary artifacts outside tracked product source are allowed",
    candidateId: "playbook:runtime-forensics",
  }),
  Object.freeze({
    name: "ps-trace-forensics",
    group: "diagnose",
    position: 60,
    displayName: "PS Trace Forensics",
    shortDescription: "Diagnose one supplied trace artifact",
    prompt: "diagnose this supplied profiling or trace artifact without changing product behavior",
    outcome: "Diagnose one supplied profiling or trace artifact",
    mutationBoundary: "Read-only",
    candidateId: "playbook:trace-forensics",
  }),
  Object.freeze({
    name: "ps-create-verification-skill",
    group: "verify",
    position: 70,
    displayName: "PS Create Verification Skill",
    shortDescription: "Create a rerunnable verification workflow",
    prompt: "create a project-local rerunnable verification workflow and feature map",
    outcome: "Create a project-local, rerunnable verification workflow and feature map",
    mutationBoundary: "Verification assets only",
    candidateId: "skill:create-verification-skill",
  }),
  Object.freeze({
    name: "ps-maintain-verification-skill",
    group: "verify",
    position: 80,
    displayName: "PS Maintain Verification Skill",
    shortDescription: "Reconcile a verification workflow with reality",
    prompt: "reconcile the selected verification workflow with observed product behavior",
    outcome: "Reconcile an existing verification workflow with observed product behavior",
    mutationBoundary: "Verification assets only; no product-behavior edits",
    candidateId: "skill:maintain-verification-skill",
  }),
  Object.freeze({
    name: "ps-skill-eval",
    group: "evaluate",
    position: 90,
    displayName: "PS Skill Evaluation",
    shortDescription: "Compare skill variants through blinded trials",
    prompt: "compare this skill or prompt variant with its control through blinded recorded trials",
    outcome: "Compare a skill or prompt change using blinded, recorded trials",
    mutationBoundary: "Evaluation fixtures and selected skill source only",
    candidateId: "playbook:eval",
  }),
  Object.freeze({
    name: "ps-hillclimb",
    group: "optimize",
    position: 100,
    displayName: "PS Hillclimb",
    shortDescription: "Improve one metric through bounded experiments",
    prompt: "improve one declared metric through bounded measured experiments",
    outcome: "Improve one declared metric through bounded, measured experiments",
    mutationBoundary: "User-selected implementation scope only; no commit, push, or publication",
    candidateId: "playbook:hillclimb",
  }),
  Object.freeze({
    name: "ps-visual-parity",
    group: "optimize",
    position: 110,
    displayName: "PS Visual Parity",
    shortDescription: "Converge toward a verified visual baseline",
    prompt: "converge the selected implementation toward its verified immutable visual baseline",
    outcome: "Converge a selected implementation toward a verified immutable visual baseline",
    mutationBoundary: "User-selected implementation scope; baseline is immutable",
    candidateId: "playbook:visual-parity",
  }),
  Object.freeze({
    name: "ps-pr-babysit",
    group: "operate",
    position: 120,
    displayName: "PS PR Babysit",
    shortDescription: "Drive one PR toward merge readiness",
    prompt: "drive the selected pull request to a truthful merge-ready assessment",
    outcome: "Drive one selected PR to a truthful merge-ready assessment and resolve authorized blockers",
    mutationBoundary: "Selected PR branch or worktree only; never merge, deploy, or release",
    candidateId: "playbook:babysit",
  }),
  Object.freeze({
    name: "ps-worktree-cleanup",
    group: "operate",
    position: 130,
    displayName: "PS Worktree Cleanup",
    shortDescription: "Audit and remove confirmed worktrees",
    prompt: "audit reclaimable worktrees and remove only explicitly confirmed exact targets",
    outcome: "Audit reclaimable worktrees and perform only explicitly confirmed removals",
    mutationBoundary: "Read-only first; destructive action requires exact confirmed targets",
    candidateId: "playbook:worktree-cleanup",
  }),
]);

const NORMAL_CONTINUATIONS = Object.freeze({
  "ps-help": Object.freeze(["ps-how", "ps-why", "qs-plan-clarify"]),
  "ps-how": Object.freeze(["ps-blast-radius", "qs-plan-spec", "ps-why"]),
  "ps-why": Object.freeze(["qs-plan-clarify", "ps-how", "ps-blast-radius"]),
  "ps-blast-radius": Object.freeze(["qs-plan-spec", "qs-review-code", "qs-flow-handoff"]),
  "ps-runtime-forensics": Object.freeze(["qs-code-debug", "ps-trace-forensics", "qs-flow-handoff"]),
  "ps-trace-forensics": Object.freeze(["qs-code-debug", "ps-runtime-forensics", "qs-flow-handoff"]),
  "ps-create-verification-skill": Object.freeze(["ps-maintain-verification-skill", "qs-review-code", "qs-git-merge"]),
  "ps-maintain-verification-skill": Object.freeze(["qs-review-code", "ps-create-verification-skill", "qs-flow-handoff"]),
  "ps-skill-eval": Object.freeze(["qs-skill-write", "qs-plan-clarify", "qs-flow-handoff"]),
  "ps-hillclimb": Object.freeze(["qs-review-code", "qs-test-verify", "qs-flow-handoff"]),
  "ps-visual-parity": Object.freeze(["qs-review-code", "qs-test-verify", "qs-flow-handoff"]),
  "ps-pr-babysit": Object.freeze(["qs-git-merge", "qs-code-debug", "qs-flow-handoff"]),
  "ps-worktree-cleanup": Object.freeze(["qs-flow-handoff", "qs-setup", "ps-help"]),
});

const FAILURE_CONTINUATIONS = Object.freeze({
  "ps-help": Object.freeze(["qs-plan-clarify", "qs-flow-handoff", "ps-how"]),
  "ps-how": Object.freeze(["qs-plan-clarify", "qs-flow-handoff", "ps-why"]),
  "ps-why": Object.freeze(["qs-plan-clarify", "qs-flow-handoff", "ps-how"]),
  "ps-blast-radius": Object.freeze(["qs-plan-clarify", "qs-flow-handoff", "ps-how"]),
  "ps-runtime-forensics": Object.freeze(["qs-code-debug", "qs-flow-handoff", "ps-trace-forensics"]),
  "ps-trace-forensics": Object.freeze(["qs-code-debug", "qs-flow-handoff", "ps-runtime-forensics"]),
  "ps-create-verification-skill": Object.freeze(["qs-code-debug", "qs-review-code", "qs-flow-handoff"]),
  "ps-maintain-verification-skill": Object.freeze(["ps-create-verification-skill", "qs-code-debug", "qs-flow-handoff"]),
  "ps-skill-eval": Object.freeze(["qs-plan-clarify", "qs-skill-write", "qs-flow-handoff"]),
  "ps-hillclimb": Object.freeze(["qs-code-debug", "qs-test-verify", "qs-flow-handoff"]),
  "ps-visual-parity": Object.freeze(["qs-code-debug", "qs-test-verify", "qs-flow-handoff"]),
  "ps-pr-babysit": Object.freeze(["qs-code-debug", "qs-review-code", "qs-flow-handoff"]),
  "ps-worktree-cleanup": Object.freeze(["qs-flow-handoff", "ps-help", "qs-setup"]),
});

const READOUT_PROFILE_DEFINITIONS = Object.freeze({
  "ps-help": Object.freeze(["Workflow recommendation", "flow", ["decisions", "findings", "outputs", "checks"]]),
  "ps-how": Object.freeze(["Subsystem walkthrough", "flow", ["findings", "decisions", "outputs", "checks"]]),
  "ps-why": Object.freeze(["Rationale evidence", "matrix", ["findings", "decisions", "checks", "outputs"]]),
  "ps-blast-radius": Object.freeze(["Change impact map", "matrix", ["findings", "checks", "decisions", "outputs"]]),
  "ps-runtime-forensics": Object.freeze(["Runtime diagnosis", "flow", ["findings", "checks", "decisions", "outputs"]]),
  "ps-trace-forensics": Object.freeze(["Trace diagnosis", "bars", ["findings", "checks", "decisions", "outputs"]]),
  "ps-create-verification-skill": Object.freeze(["Verification workflow creation", "checks", ["outputs", "checks", "decisions", "findings"]]),
  "ps-maintain-verification-skill": Object.freeze(["Verification coverage maintenance", "matrix", ["findings", "outputs", "checks", "decisions"]]),
  "ps-skill-eval": Object.freeze(["Blinded skill evaluation", "matrix", ["checks", "findings", "decisions", "outputs"]]),
  "ps-hillclimb": Object.freeze(["Metric experiment ledger", "bars", ["checks", "findings", "decisions", "outputs"]]),
  "ps-visual-parity": Object.freeze(["Visual parity matrix", "matrix", ["checks", "findings", "outputs", "decisions"]]),
  "ps-pr-babysit": Object.freeze(["PR readiness", "checks", ["checks", "findings", "decisions", "outputs"]]),
  "ps-worktree-cleanup": Object.freeze(["Cleanup audit", "checks", ["findings", "decisions", "checks", "outputs"]]),
});

function completionEvidence(requiredSections, {
  sectionMode = "any",
  requiredCheckDetailFields = [],
} = {}) {
  return Object.freeze({
    requiredSections: Object.freeze(requiredSections),
    sectionMode,
    requiredCheckDetailFields: Object.freeze(requiredCheckDetailFields),
  });
}

const COMPLETION_EVIDENCE_BY_NAME = Object.freeze({
  "ps-blast-radius": completionEvidence(["checks", "findings"]),
  "ps-runtime-forensics": completionEvidence(["checks", "findings"]),
  "ps-trace-forensics": completionEvidence(["checks", "findings"]),
  "ps-create-verification-skill": completionEvidence(["checks"]),
  "ps-maintain-verification-skill": completionEvidence(["checks"]),
  "ps-skill-eval": completionEvidence(["checks"]),
  "ps-hillclimb": completionEvidence(["checks"]),
  "ps-visual-parity": completionEvidence(["checks"], {
    requiredCheckDetailFields: ["metric", "tolerance", "residual"],
  }),
  "ps-pr-babysit": completionEvidence(["checks"]),
  "ps-worktree-cleanup": completionEvidence(["checks", "decisions"], { sectionMode: "all" }),
});

function defineContinuation(name, rank, failure) {
  return Object.freeze({
    name,
    rank,
    availability: failure ? "failure" : "success",
    recovery: failure,
    instruction: failure
      ? "continue from the failed result through this separate public workflow"
      : "continue from the completed result through this separate public workflow",
    reason: failure
      ? "Use this ranked recovery route when the root run cannot complete."
      : "Use this ranked follow-on route after the root run completes.",
  });
}

function defineReadoutProfile(name) {
  const [title, visualization, sections] = READOUT_PROFILE_DEFINITIONS[name];
  return Object.freeze({
    title,
    visualization,
    sections: Object.freeze([...sections]),
    labels: Object.freeze({}),
  });
}

function definePublicCommand(definition) {
  const normal = NORMAL_CONTINUATIONS[definition.name];
  const failure = FAILURE_CONTINUATIONS[definition.name];
  return Object.freeze({
    name: definition.name,
    displayName: definition.displayName,
    shortDescription: definition.shortDescription,
    prompt: definition.prompt,
    outcome: definition.outcome,
    mutationBoundary: definition.mutationBoundary,
    collection: PS_COLLECTION.id,
    packageName: PS_COLLECTION.packageName,
    codexPlugin: PS_COLLECTION.codexPlugin,
    sourcePath: `${PS_COLLECTION.canonicalRoot}/${definition.name}`,
    documentationPath: `${PS_COLLECTION.documentationRoot}/${definition.name}.md`,
    lifecycle: Object.freeze({ group: definition.group, position: definition.position }),
    invocationPolicy: "explicit",
    disableModelInvocation: true,
    allowImplicitInvocation: false,
    effort: EFFORT_POLICY,
    report: REPORT_POLICY,
    provenance: Object.freeze({
      kind: definition.candidateId === null ? "repository-authored" : "upstream-adaptation",
      candidateId: definition.candidateId,
    }),
    readoutProfile: defineReadoutProfile(definition.name),
    ...(COMPLETION_EVIDENCE_BY_NAME[definition.name]
      ? { completionEvidence: COMPLETION_EVIDENCE_BY_NAME[definition.name] }
      : {}),
    continuation: Object.freeze({
      normal: Object.freeze(normal.map((name, index) => defineContinuation(name, index + 1, false))),
      failure: Object.freeze(failure.map((name, index) => defineContinuation(name, index + 1, true))),
      approvedSkills: Object.freeze([...new Set([...normal, ...failure])]),
      maximumPrompts: 3,
      defaultPrompts: 3,
      preferredPromptIndex: 0,
      automaticPublicSkillHops: false,
      promptStates: Object.freeze(["complete", "continuation-required", "input-required", "failed"]),
    }),
  });
}

export const PS_PUBLIC_COMMANDS = Object.freeze(COMMAND_DEFINITIONS.map(definePublicCommand));

export const PS_PUBLIC_COMMANDS_BY_NAME = new Map(
  PS_PUBLIC_COMMANDS.map((command) => [command.name, command]),
);

const MUTATING_COMMANDS = Object.freeze([
  "ps-create-verification-skill",
  "ps-maintain-verification-skill",
  "ps-skill-eval",
  "ps-hillclimb",
  "ps-visual-parity",
  "ps-pr-babysit",
  "ps-worktree-cleanup",
]);

const INTERNAL_CAPABILITY_DEFINITIONS = Object.freeze([
  ["multi-candidate-exploration", "skill:arena", ["ps-skill-eval", "ps-hillclimb", "ps-visual-parity"]],
  ["decision-trail", "skill:show-me-your-work", MUTATING_COMMANDS],
  ["parallel-coverage", "skill:swarm", ["ps-how", "ps-why", "ps-blast-radius", "ps-skill-eval"]],
  ["typescript-discipline", "skill:typescript-best-practices", PS_PUBLIC_COMMANDS.map((command) => command.name)],
  ["plain-writing", "skill:unslop", PS_PUBLIC_COMMANDS.map((command) => command.name)],
  ["boundary-discipline", "principle:principle-boundary-discipline", ["ps-create-verification-skill", "ps-maintain-verification-skill", "ps-pr-babysit", "ps-worktree-cleanup"]],
  ["rerunnable-tooling", "principle:principle-build-the-lever", ["ps-create-verification-skill", "ps-maintain-verification-skill", "ps-skill-eval", "ps-hillclimb"]],
  ["structural-enforcement", "principle:principle-encode-lessons-in-structure", ["ps-create-verification-skill", "ps-maintain-verification-skill", "ps-skill-eval"]],
  ["experience-first", "principle:principle-experience-first", ["ps-visual-parity", "ps-hillclimb"]],
  ["context-discipline", "principle:principle-guard-the-context-window", ["ps-how", "ps-why", "ps-blast-radius", "ps-runtime-forensics", "ps-trace-forensics", "ps-skill-eval", "ps-hillclimb", "ps-visual-parity", "ps-pr-babysit"]],
  ["minimal-change", "principle:principle-laziness-protocol", MUTATING_COMMANDS],
  ["idempotent-operations", "principle:principle-make-operations-idempotent", ["ps-create-verification-skill", "ps-maintain-verification-skill", "ps-worktree-cleanup"]],
  ["outcome-oriented-execution", "principle:principle-outcome-oriented-execution", ["ps-hillclimb", "ps-pr-babysit", "ps-worktree-cleanup"]],
  ["concurrency-ownership", "principle:principle-separate-before-serializing-shared-state", ["ps-how", "ps-why", "ps-blast-radius", "ps-skill-eval", "ps-hillclimb", "ps-pr-babysit"]],
  ["type-system-discipline", "principle:principle-type-system-discipline", PS_PUBLIC_COMMANDS.filter((command) => command.name !== "ps-help").map((command) => command.name)],
  ["bounded-autonomous-loop", "playbook:autonomous-run", ["ps-hillclimb", "ps-pr-babysit"]],
]);

export const PS_INTERNAL_CAPABILITIES = Object.freeze(
  INTERNAL_CAPABILITY_DEFINITIONS.map(([name, candidateId, owners]) => Object.freeze({
    name,
    candidateId,
    sourcePath: `skills/pstack/internal/${name}.md`,
    owners: Object.freeze([...owners]),
  })),
);

const DISPOSITION_DEFINITIONS = Object.freeze([
  ["skill:architect", "merge", ["qs-plan-spec", "module-decomposition"]],
  ["skill:arena", "internal", "multi-candidate-exploration"],
  ["skill:automate-me", "merge", ["qs-skill-write"]],
  ["skill:blast-radius", "public", "ps-blast-radius"],
  ["skill:bro", "omit", "style-only prompt does not warrant a command"],
  ["skill:create-verification-skill", "public", "ps-create-verification-skill"],
  ["skill:figure-it-out", "merge", ["qs-plan-roadmap", "qs-plan-spec"]],
  ["skill:how", "public", "ps-how"],
  ["skill:interrogate", "merge", ["qs-review-code"]],
  ["skill:maintain-verification-skill", "public", "ps-maintain-verification-skill"],
  ["skill:no-comments", "omit", "blanket comment removal conflicts with evidence-based review"],
  ["skill:poteto-mode", "omit", "persistent automatic router conflicts with one-root runs"],
  ["skill:recall", "dependency", "optional-history-adapter"],
  ["skill:reflect", "merge", ["qs-skill-write"]],
  ["skill:setup-pstack", "omit", "model and provider configuration is host-specific"],
  ["skill:show-me-your-work", "internal", "decision-trail"],
  ["skill:swarm", "internal", "parallel-coverage"],
  ["skill:tdd", "merge", ["tdd-loop", "qs-code-build"]],
  ["skill:teach", "merge", ["qs-learn-teach"]],
  ["skill:technical-writing", "merge", ["qs-code-document", "qs-skill-write"]],
  ["skill:typescript-best-practices", "internal", "typescript-discipline"],
  ["skill:unslop", "internal", "plain-writing"],
  ["skill:why", "public", "ps-why"],

  ["principle:principle-boundary-discipline", "internal", "boundary-discipline"],
  ["principle:principle-build-the-lever", "internal", "rerunnable-tooling"],
  ["principle:principle-encode-lessons-in-structure", "internal", "structural-enforcement"],
  ["principle:principle-exhaust-the-design-space", "merge", ["qs-design-prototype"]],
  ["principle:principle-experience-first", "internal", "experience-first"],
  ["principle:principle-fix-root-causes", "merge", ["qs-code-debug"]],
  ["principle:principle-foundational-thinking", "merge", ["qs-plan-spec", "module-decomposition"]],
  ["principle:principle-guard-the-context-window", "internal", "context-discipline"],
  ["principle:principle-laziness-protocol", "internal", "minimal-change"],
  ["principle:principle-make-operations-idempotent", "internal", "idempotent-operations"],
  ["principle:principle-migrate-callers-then-delete-legacy-apis", "merge", ["qs-review-code"]],
  ["principle:principle-minimize-reader-load", "merge", ["qs-review-code"]],
  ["principle:principle-model-the-domain", "merge", ["domain-modeling"]],
  ["principle:principle-never-block-on-the-human", "merge", ["qs-plan-clarify", "safety-policy"]],
  ["principle:principle-outcome-oriented-execution", "internal", "outcome-oriented-execution"],
  ["principle:principle-prove-it-works", "merge", ["qs-test-verify", "skill-run-contract"]],
  ["principle:principle-redesign-from-first-principles", "merge", ["qs-plan-spec", "qs-review-code"]],
  ["principle:principle-separate-before-serializing-shared-state", "internal", "concurrency-ownership"],
  ["principle:principle-sequence-verifiable-units", "merge", ["qs-code-build", "qs-git-merge"]],
  ["principle:principle-subtract-before-you-add", "merge", ["qs-review-code"]],
  ["principle:principle-type-system-discipline", "internal", "type-system-discipline"],

  ["playbook:authoring-a-skill", "merge", ["qs-skill-write"]],
  ["playbook:autonomous-run", "internal", "bounded-autonomous-loop"],
  ["playbook:autopilot-full", "omit", "automatic publication and merge ownership exceed a bounded root"],
  ["playbook:autopilot-stack", "omit", "automatic stack construction and publication exceed a bounded root"],
  ["playbook:babysit", "public", "ps-pr-babysit"],
  ["playbook:bug-fix", "merge", ["qs-code-debug"]],
  ["playbook:eval", "public", "ps-skill-eval"],
  ["playbook:feature", "merge", ["qs-code-build"]],
  ["playbook:hillclimb", "public", "ps-hillclimb"],
  ["playbook:investigation", "omit", "redundant router over understanding and forensics roots"],
  ["playbook:multi-phase-plan", "merge", ["qs-plan-roadmap", "qs-plan-spec"]],
  ["playbook:opening-a-pr", "merge", ["qs-git-merge"]],
  ["playbook:orchestrate", "omit", "standing multi-day coordinator conflicts with bounded root ownership"],
  ["playbook:pause-safely", "merge", ["qs-flow-handoff"]],
  ["playbook:perf-issue", "merge", ["qs-code-debug"]],
  ["playbook:prototype", "merge", ["qs-design-prototype"]],
  ["playbook:refactoring", "merge", ["qs-review-code"]],
  ["playbook:runtime-forensics", "public", "ps-runtime-forensics"],
  ["playbook:session-pickup", "merge", ["qs-flow-handoff"]],
  ["playbook:shipping", "merge", ["qs-git-merge"]],
  ["playbook:trace-forensics", "public", "ps-trace-forensics"],
  ["playbook:visual-parity", "public", "ps-visual-parity"],
  ["playbook:worktree-cleanup", "public", "ps-worktree-cleanup"],

  ["agent:comment-sicko", "omit", "blanket comment-removal agent is not a safe reusable boundary"],
  ["agent:poteto-agent", "omit", "persona and mode wrapper conflicts with host neutrality and one-root runs"],

  ["benny-skill:setup-benny", "dependency", "benny-issue-provider-and-scheduler-integration"],
  ["benny-skill:triage-issue-reports", "dependency", "benny-issue-provider-integration"],
  ["benny-skill:reproduce-and-fix-issues", "dependency", "benny-issue-verification-and-scheduler-integration"],
]);

function freezeTarget(target) {
  return Array.isArray(target) ? Object.freeze([...target]) : target;
}

export const PS_DISPOSITIONS = Object.freeze(
  DISPOSITION_DEFINITIONS.map(([candidateId, kind, target]) => Object.freeze({
    candidateId,
    kind,
    target: freezeTarget(target),
  })),
);

export const PS_DISPOSITIONS_BY_ID = new Map(
  PS_DISPOSITIONS.map((disposition) => [disposition.candidateId, disposition]),
);

export const PS_CATALOG = Object.freeze({
  schemaVersion: 1,
  collection: PS_COLLECTION,
  upstream: PS_UPSTREAM,
  publicCommands: PS_PUBLIC_COMMANDS,
  internalCapabilities: PS_INTERNAL_CAPABILITIES,
  dispositions: PS_DISPOSITIONS,
  dispositionTotals: Object.freeze({
    public: 12,
    internal: 16,
    merge: 30,
    dependency: 4,
    omit: 10,
  }),
});

function hasExactValues(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function requireExactValues(actual, expected, label) {
  if (!hasExactValues(actual, expected)) {
    throw new Error(`The PS catalog must preserve the confirmed ${label}.`);
  }
}

function requirePlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`The PS catalog must contain ${label}.`);
  }
}

export function validatePsCatalogModel(model) {
  requirePlainObject(model, "one catalog object");
  requirePlainObject(model.collection, "collection metadata");
  requirePlainObject(model.upstream, "upstream provenance");

  if (model.schemaVersion !== 1) {
    throw new Error("The PS catalog must identify schema version 1.");
  }

  for (const [key, expected] of Object.entries(PS_COLLECTION)) {
    if (model.collection[key] !== expected) {
      throw new Error("The PS catalog collection metadata does not match ps-skills.");
    }
  }

  for (const [key, expected] of Object.entries(PS_UPSTREAM)) {
    if (model.upstream[key] !== expected) {
      throw new Error("The PS catalog upstream provenance does not match pstack 0.14.1.");
    }
  }

  if (!Array.isArray(model.publicCommands) || model.publicCommands.length !== 13) {
    throw new Error("The PS catalog must contain thirteen ordered public commands.");
  }

  const expectedPublicNames = COMMAND_DEFINITIONS.map((definition) => definition.name);
  const publicNames = model.publicCommands.map((command) => command.name);
  requireExactValues(publicNames, expectedPublicNames, "thirteen ordered public commands");
  const publicNameSet = new Set(publicNames);

  for (const [index, command] of model.publicCommands.entries()) {
    const expected = COMMAND_DEFINITIONS[index];
    if (command.lifecycle?.group !== expected.group
      || command.lifecycle?.position !== expected.position
      || command.lifecycle.position !== (index + 1) * 10) {
      throw new Error(`The PS command ${command.name} has invalid lifecycle metadata.`);
    }

    if (command.invocationPolicy !== "explicit"
      || command.disableModelInvocation !== true
      || command.allowImplicitInvocation !== false) {
      throw new Error(`The PS command ${command.name} must remain explicit-only in v1.`);
    }

    if (command.collection !== PS_COLLECTION.id
      || command.packageName !== PS_COLLECTION.packageName
      || command.codexPlugin !== PS_COLLECTION.codexPlugin) {
      throw new Error(`The PS command ${command.name} has invalid package membership.`);
    }

    if (!hasExactValues(command.effort?.supported, EFFORT_POLICY.supported)
      || command.effort?.default !== EFFORT_POLICY.default
      || !hasExactValues(command.report?.supported, REPORT_POLICY.supported)
      || command.report?.default !== REPORT_POLICY.default) {
      throw new Error(`The PS command ${command.name} has invalid effort or report policy.`);
    }

    const expectedProvenanceKind = expected.candidateId === null
      ? "repository-authored"
      : "upstream-adaptation";
    if (command.provenance?.kind !== expectedProvenanceKind
      || command.provenance?.candidateId !== expected.candidateId) {
      throw new Error(`The PS command ${command.name} has invalid provenance.`);
    }

    const expectedProfile = READOUT_PROFILE_DEFINITIONS[command.name];
    if (command.readoutProfile?.title !== expectedProfile[0]
      || command.readoutProfile?.visualization !== expectedProfile[1]
      || !hasExactValues(command.readoutProfile?.sections, expectedProfile[2])) {
      throw new Error(`The PS command ${command.name} has invalid readout profile metadata.`);
    }

    const expectedCompletionEvidence = COMPLETION_EVIDENCE_BY_NAME[command.name];
    if (expectedCompletionEvidence) {
      requireExactValues(
        command.completionEvidence?.requiredSections,
        expectedCompletionEvidence.requiredSections,
        `${command.name} completion-evidence sections`,
      );
      if (command.completionEvidence?.sectionMode !== expectedCompletionEvidence.sectionMode) {
        throw new Error(`The PS command ${command.name} has an invalid completion-evidence section mode.`);
      }
      requireExactValues(
        command.completionEvidence?.requiredCheckDetailFields,
        expectedCompletionEvidence.requiredCheckDetailFields,
        `${command.name} completion-evidence check fields`,
      );
    } else if (command.completionEvidence !== undefined) {
      throw new Error(`The PS command ${command.name} has unexpected completion-evidence requirements.`);
    }

    const continuation = command.continuation;
    if (continuation?.maximumPrompts !== 3
      || continuation?.defaultPrompts !== 3
      || continuation?.preferredPromptIndex !== 0
      || continuation?.automaticPublicSkillHops !== false) {
      throw new Error(`The PS command ${command.name} must prohibit automatic public skill hops.`);
    }

    requireExactValues(
      continuation?.normal?.map((item) => item.name),
      NORMAL_CONTINUATIONS[command.name],
      `${command.name} normal continuations`,
    );
    requireExactValues(
      continuation?.failure?.map((item) => item.name),
      FAILURE_CONTINUATIONS[command.name],
      `${command.name} failure continuations`,
    );
  }

  const expectedCapabilityNames = INTERNAL_CAPABILITY_DEFINITIONS.map(([name]) => name);
  if (!Array.isArray(model.internalCapabilities)) {
    throw new Error("The PS catalog must contain internal capabilities.");
  }
  requireExactValues(
    model.internalCapabilities.map((capability) => capability.name),
    expectedCapabilityNames,
    "sixteen internal capabilities",
  );

  for (const capability of model.internalCapabilities) {
    if (!Array.isArray(capability.owners)
      || capability.owners.length === 0
      || capability.owners.some((owner) => !publicNameSet.has(owner))) {
      throw new Error(`The PS internal capability ${capability.name} must have valid public owners.`);
    }
  }

  if (!Array.isArray(model.dispositions) || model.dispositions.length !== 72) {
    throw new Error("The PS catalog must contain exactly 72 dispositions.");
  }

  const candidateIds = model.dispositions.map((disposition) => disposition.candidateId);
  if (new Set(candidateIds).size !== 72) {
    throw new Error("The PS catalog must classify every candidate exactly once.");
  }
  requireExactValues(
    candidateIds,
    DISPOSITION_DEFINITIONS.map(([candidateId]) => candidateId),
    "pinned candidate identity and order",
  );

  const expectedTotals = { public: 12, internal: 16, merge: 30, dependency: 4, omit: 10 };
  const actualTotals = Object.fromEntries(Object.keys(expectedTotals).map((kind) => [
    kind,
    model.dispositions.filter((disposition) => disposition.kind === kind).length,
  ]));
  if (Object.entries(expectedTotals).some(([kind, count]) => actualTotals[kind] !== count)) {
    throw new Error("The PS catalog disposition totals must remain 12/16/30/4/10.");
  }

  const upstreamPublicNames = new Set(publicNames.slice(1));
  const publicDispositions = model.dispositions.filter((disposition) => disposition.kind === "public");
  if (publicDispositions.some((disposition) => !upstreamPublicNames.has(disposition.target))
    || new Set(publicDispositions.map((disposition) => disposition.target)).size !== 12) {
    throw new Error("Every public disposition must target one upstream-derived PS command.");
  }

  const capabilitiesByName = new Map(
    model.internalCapabilities.map((capability) => [capability.name, capability]),
  );
  for (const disposition of model.dispositions.filter((item) => item.kind === "internal")) {
    const capability = capabilitiesByName.get(disposition.target);
    if (!capability || capability.candidateId !== disposition.candidateId) {
      throw new Error("Every internal disposition must target its owning PS capability.");
    }
  }

  return true;
}

validatePsCatalogModel(PS_CATALOG);

export function psCodexSkillLiteral(name) {
  if (!PS_PUBLIC_COMMANDS_BY_NAME.has(name)) {
    throw new Error(`/${name} is not a PS public command.`);
  }
  return `$${PS_COLLECTION.codexPlugin}:${name}`;
}
