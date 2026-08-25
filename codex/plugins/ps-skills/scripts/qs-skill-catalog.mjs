export const COLLECTION_PREFIX = "qs";
export const COLLECTION_NAME = "QuickStark Skills";
export const PERSONAL_REPOSITORY = "https://github.com/quickstark/skills";
export const UPSTREAM_REPOSITORY = "https://github.com/mattpocock/skills";

const LEGACY_V2_SKILLS = Object.freeze([
  {
    bucket: "engineering",
    upstreamName: "ask-matt",
    name: "qs-help",
    displayName: "QS Help",
    shortDescription: "Find the right QuickStark skill or workflow",
    prompt: "find the right skill or workflow for my current task",
    userInvoked: true,
  },
  {
    bucket: "engineering",
    upstreamName: "setup-matt-pocock-skills",
    name: "qs-setup",
    displayName: "QS Setup",
    shortDescription: "Configure project trackers, labels, and docs",
    prompt: "configure this project for the QuickStark engineering skills",
    userInvoked: true,
  },
  {
    bucket: "engineering",
    upstreamName: "grill-with-docs",
    name: "qs-plan-clarify",
    displayName: "QS Plan: Clarify",
    shortDescription: "Clarify a plan and capture durable decisions",
    prompt: "clarify this project and document the resulting decisions",
    userInvoked: true,
  },
  {
    bucket: "productivity",
    upstreamName: "grill-me",
    name: "qs-plan-explore",
    displayName: "QS Plan: Explore",
    shortDescription: "Explore and pressure-test an early idea",
    prompt: "explore and pressure-test this idea through focused questions",
    userInvoked: true,
  },
  {
    bucket: "productivity",
    upstreamName: "grilling",
    name: "qs-plan-interview",
    displayName: "QS Plan: Interview",
    shortDescription: "Resolve decisions with a focused interview",
    prompt: "interview me one question at a time to resolve this decision",
    userInvoked: false,
  },
  {
    bucket: "engineering",
    upstreamName: "to-spec",
    name: "qs-plan-spec",
    displayName: "QS Plan: Specification",
    shortDescription: "Turn agreed requirements into a clear spec",
    prompt: "turn the agreed requirements into an actionable specification",
    userInvoked: true,
  },
  {
    bucket: "engineering",
    upstreamName: "to-tickets",
    name: "qs-plan-tickets",
    displayName: "QS Plan: Tickets",
    shortDescription: "Break a plan into dependency-aware tickets",
    prompt: "break this plan into small, dependency-aware implementation tickets",
    userInvoked: true,
  },
  {
    bucket: "engineering",
    upstreamName: "wayfinder",
    name: "qs-plan-roadmap",
    displayName: "QS Plan: Roadmap",
    shortDescription: "Map large projects into manageable decisions",
    prompt: "map this large project into a practical sequence of decisions",
    userInvoked: true,
  },
  {
    bucket: "engineering",
    upstreamName: "research",
    name: "qs-plan-research",
    displayName: "QS Plan: Research",
    shortDescription: "Research a question using reliable sources",
    prompt: "research this question and capture evidence-backed findings",
    userInvoked: false,
  },
  {
    bucket: "engineering",
    upstreamName: "prototype",
    name: "qs-design-prototype",
    displayName: "QS Design: Prototype",
    shortDescription: "Prototype an interface or design decision",
    prompt: "build a focused prototype to answer this design question",
    userInvoked: false,
  },
  {
    bucket: "engineering",
    upstreamName: "domain-modeling",
    name: "qs-design-domain",
    displayName: "QS Design: Domain",
    shortDescription: "Model project concepts and shared vocabulary",
    prompt: "clarify this project's domain model and shared vocabulary",
    userInvoked: false,
  },
  {
    bucket: "engineering",
    upstreamName: "codebase-design",
    name: "qs-design-modules",
    displayName: "QS Design: Modules",
    shortDescription: "Design clean, testable software modules",
    prompt: "design a clean, deep, and testable module for this problem",
    userInvoked: false,
  },
  {
    bucket: "engineering",
    upstreamName: "improve-codebase-architecture",
    name: "qs-design-architecture",
    displayName: "QS Design: Architecture",
    shortDescription: "Find and improve architecture weak points",
    prompt: "find the highest-value architecture improvements in this codebase",
    userInvoked: true,
  },
  {
    bucket: "engineering",
    upstreamName: "implement",
    name: "qs-code-build",
    displayName: "QS Code: Build",
    shortDescription: "Implement a specification or tracked ticket",
    prompt: "implement this specification or ticket with appropriate tests",
    userInvoked: true,
  },
  {
    bucket: "engineering",
    upstreamName: null,
    name: "qs-code-document",
    displayName: "QS Code: Document",
    shortDescription: "Write accurate, verified project documentation",
    prompt: "write or update accurate documentation for the actual project and its verified behavior",
    userInvoked: false,
  },
  {
    bucket: "engineering",
    upstreamName: "diagnosing-bugs",
    name: "qs-code-debug",
    displayName: "QS Code: Debug",
    shortDescription: "Reproduce and diagnose a bug or regression",
    prompt: "reproduce, diagnose, and fix this bug with a regression test",
    userInvoked: false,
  },
  {
    bucket: "engineering",
    upstreamName: "tdd",
    name: "qs-test-tdd",
    displayName: "QS Test: TDD",
    shortDescription: "Build behavior using test-driven development",
    prompt: "implement this behavior using a red-green test-driven loop",
    userInvoked: false,
  },
  {
    bucket: "engineering",
    upstreamName: "code-review",
    name: "qs-review-code",
    displayName: "QS Review: Code",
    shortDescription: "Review, improve, or refactor selected code safely",
    prompt: "review, improve, or refactor the explicitly selected code scope safely",
    userInvoked: false,
  },
  {
    bucket: "engineering",
    upstreamName: "resolving-merge-conflicts",
    name: "qs-git-merge",
    displayName: "QS Git: Merge",
    shortDescription: "Safely integrate and publish verified GitHub changes",
    prompt: "verify and complete the actual Git integration, pull request, or GitHub publication",
    userInvoked: false,
  },
  {
    bucket: "engineering",
    upstreamName: "triage",
    name: "qs-flow-triage",
    displayName: "QS Flow: Triage",
    shortDescription: "Triage incoming issues into actionable work",
    prompt: "triage these incoming issues into clear, actionable work",
    userInvoked: true,
  },
  {
    bucket: "productivity",
    upstreamName: "handoff",
    name: "qs-flow-handoff",
    displayName: "QS Flow: Handoff",
    shortDescription: "Prepare a concise handoff for another session",
    prompt: "prepare a concise handoff so another session can continue this work",
    userInvoked: true,
  },
  {
    bucket: "productivity",
    upstreamName: "teach",
    name: "qs-learn-teach",
    displayName: "QS Learn: Teach",
    shortDescription: "Learn a subject through a guided study plan",
    prompt: "teach me this subject through a practical, guided study plan",
    userInvoked: true,
  },
  {
    bucket: "productivity",
    upstreamName: "writing-great-skills",
    name: "qs-skill-write",
    displayName: "QS Skill: Write",
    shortDescription: "Create and improve focused, reliable AI skills",
    prompt: "create or improve an effective, reliable agent skill",
    userInvoked: true,
  },
  {
    bucket: "engineering",
    upstreamName: null,
    name: "qs-deploy-release",
    displayName: "QS Deploy: Release",
    shortDescription: "Safely verify and run a documented deployment",
    prompt: "verify and run this project's documented release workflow",
    userInvoked: true,
  },
]);

const V3_ONLY_SKILLS = Object.freeze([
  {
    bucket: "engineering",
    upstreamName: null,
    name: "qs-test-author",
    displayName: "QS Test: Author",
    shortDescription: "Add focused tests for existing behavior",
    prompt: "add or improve focused automated tests for this existing behavior",
    userInvoked: true,
  },
  {
    bucket: "engineering",
    upstreamName: null,
    name: "qs-test-verify",
    displayName: "QS Test: Verify",
    shortDescription: "Run and report selected software verification",
    prompt: "run and report the selected test suites and environments without changing the software",
    userInvoked: true,
  },
]);

const ACTIVE_SKILL_DEFINITIONS = Object.freeze([
  ...LEGACY_V2_SKILLS,
  ...V3_ONLY_SKILLS,
]);

const V3_PUBLIC_METADATA_OVERRIDES = Object.freeze({
  "qs-plan-spec": Object.freeze({
    displayName: "QS Plan: Specs & Tickets",
    shortDescription: "Turn agreed requirements into a spec or tickets",
    prompt: "turn the agreed requirements into an actionable specification or dependency-aware implementation tickets",
    documentationNotes: Object.freeze([
      "The same root command can produce a specification, dependency-aware tickets, or both when requested.",
      "Specification-only requests do not create tickets.",
      "Ticket decomposition remains an internal capability of `/qs-plan-spec`; it is not another installable command.",
    ]),
  }),
});

const LEGACY_V2_SKILLS_BY_NAME = new Map(
  LEGACY_V2_SKILLS.map((skill) => [skill.name, skill]),
);

const ACTIVE_SKILLS_BY_NAME = new Map(
  ACTIVE_SKILL_DEFINITIONS.map((skill) => [skill.name, skill]),
);

const V3_CORE_COMMAND_DEFINITIONS = Object.freeze([
  ["qs-help", "help", 10],
  ["qs-setup", "setup", 20],
  ["qs-plan-clarify", "plan", 30],
  ["qs-plan-roadmap", "plan", 40],
  ["qs-plan-spec", "plan", 50],
  ["qs-code-build", "code", 60],
  ["qs-code-debug", "code", 70],
  ["qs-review-code", "review", 80],
  ["qs-git-merge", "git", 90],
  ["qs-deploy-release", "deploy", 100],
  ["qs-flow-triage", "flow", 110],
  ["qs-flow-handoff", "flow", 120],
]);

const V3_SPECIALIST_COMMAND_DEFINITIONS = Object.freeze([
  ["qs-plan-research", "plan", 130],
  ["qs-design-prototype", "design", 140],
  ["qs-code-document", "code", 150],
  ["qs-test-author", "test", 160],
  ["qs-test-verify", "test", 170],
  ["qs-learn-teach", "learn", 180],
  ["qs-skill-write", "skill", 190],
]);

function defineV3Continuation(
  name,
  instruction,
  reason,
  { recovery = false, availability = "always" } = {},
) {
  return Object.freeze({ name, instruction, reason, recovery, availability });
}

const V3_CONTINUATIONS_BY_NAME = Object.freeze({
  "qs-help": Object.freeze([
    defineV3Continuation("qs-plan-clarify", "to clarify the selected work and record the decisions needed to proceed", "Best default when the next workflow still needs a bounded decision."),
    defineV3Continuation("qs-flow-triage", "to classify the incoming work and choose its execution route", "Use for an issue or request that has not been routed yet."),
    defineV3Continuation("qs-setup", "to configure QuickStark for this project before work begins", "Use when the project is not configured for QuickStark."),
  ]),
  "qs-setup": Object.freeze([
    defineV3Continuation("qs-plan-clarify", "to clarify the first scoped change in the configured project", "Best default for starting bounded project work."),
    defineV3Continuation("qs-flow-triage", "to triage the configured project's incoming work", "Use when a backlog or new request needs routing."),
    defineV3Continuation("qs-plan-roadmap", "to map the configured project's larger initiative into decisions", "Use when the work spans several dependent decisions."),
  ]),
  "qs-plan-clarify": Object.freeze([
    defineV3Continuation("qs-plan-spec", "to turn the resolved decisions into an actionable specification or dependency-aware tickets", "Best default once the important decisions are settled."),
    defineV3Continuation("qs-plan-roadmap", "to map the clarified work into ordered decisions and milestones", "Use when the clarified scope is still too large for one specification."),
    defineV3Continuation("qs-flow-handoff", "to hand the clarified decisions to a fresh session", "Use when another session should continue from the decisions."),
  ]),
  "qs-plan-roadmap": Object.freeze([
    defineV3Continuation("qs-plan-spec", "to turn the highest-priority resolved roadmap item into a specification or dependency-aware tickets", "Best default for moving the next ready item toward implementation."),
    defineV3Continuation("qs-plan-clarify", "to resolve the roadmap's highest-impact open decision", "Use when a blocking decision remains unresolved."),
    defineV3Continuation("qs-flow-handoff", "to hand the roadmap and its next decision to another session", "Use when execution will continue in a fresh session."),
  ]),
  "qs-plan-spec": Object.freeze([
    defineV3Continuation("qs-code-build", "to implement the specification with focused tests", "Best default for an approved implementation-ready specification."),
    defineV3Continuation("qs-plan-clarify", "to resolve a material ambiguity found in the specification", "Use when implementation would require guessing."),
    defineV3Continuation("qs-flow-handoff", "to hand the specification to the implementation session", "Use when another session will perform the build."),
  ]),
  "qs-code-build": Object.freeze([
    defineV3Continuation("qs-git-merge", "to verify and integrate the completed, internally reviewed change", "Use only after the build and required checks pass.", { availability: "success" }),
    defineV3Continuation("qs-code-debug", "to diagnose a failed check that cannot be resolved inside the scoped build", "Use only when a concrete failure requires a distinct diagnosis.", { recovery: true, availability: "failure" }),
    defineV3Continuation("qs-flow-handoff", "to preserve the failed build evidence for another session", "Use when the failed build must be continued elsewhere.", { availability: "failure" }),
  ]),
  "qs-code-debug": Object.freeze([
    defineV3Continuation("qs-git-merge", "to verify and integrate the repaired, internally reviewed defect", "Use only after the regression and wider checks pass.", { availability: "success" }),
    defineV3Continuation("qs-code-build", "to implement the next verified separate agent-ready work item", "Use only after repair integration and when the readout names the exact item.", { availability: "success" }),
    defineV3Continuation("qs-flow-handoff", "to hand off the diagnosis, blocker evidence, and remaining repair", "Use only when another session must continue a blocked repair.", { recovery: true, availability: "failure" }),
  ]),
  "qs-review-code": Object.freeze([
    defineV3Continuation("qs-git-merge", "to verify and integrate the reviewed change", "Best default when review has no blocking findings.", { availability: "success" }),
    defineV3Continuation("qs-code-build", "to resolve actionable findings from an explicitly read-only review", "Use only when the review was not authorized to edit.", { recovery: true, availability: "failure" }),
    defineV3Continuation("qs-code-debug", "to diagnose a failed check that cannot be resolved by the authorized improvement", "Use only when review exposes a distinct reproducible failure.", { recovery: true, availability: "failure" }),
    defineV3Continuation("qs-flow-handoff", "to preserve blocking review findings for another session", "Use when another session must resolve the review findings.", { availability: "failure" }),
  ]),
  "qs-git-merge": Object.freeze([
    defineV3Continuation("qs-deploy-release", "to run the documented release only when deployment is explicitly approved", "Preferred only when the documented deployment is explicitly approved.", { availability: "success" }),
    defineV3Continuation("qs-review-code", "with target=changes action=review to inspect integration or conflict resolution", "Use when integration changed code or exposed uncertainty.", { recovery: true }),
    defineV3Continuation("qs-code-build", "to implement the next verified separate agent-ready work item", "Use after integration when the readout names the exact item.", { availability: "success" }),
    defineV3Continuation("qs-code-debug", "to diagnose a failed integration check", "Use when integration leaves a reproducible technical failure.", { recovery: true, availability: "failure" }),
  ]),
  "qs-deploy-release": Object.freeze([]),
  "qs-flow-triage": Object.freeze([
    defineV3Continuation("qs-plan-roadmap", "to map the highest-value large request into manageable decisions", "Best default for work that is larger than one bounded change."),
    defineV3Continuation("qs-code-debug", "to reproduce and diagnose the highest-priority bug", "Use for a routed defect with reproducible symptoms.", { recovery: true }),
    defineV3Continuation("qs-code-build", "to implement the highest-priority agent-ready issue", "Use for a clear issue with no unresolved decisions."),
  ]),
  "qs-flow-handoff": Object.freeze([
    defineV3Continuation("qs-help", "to select the correct workflow from the recorded handoff", "Best default when the receiving session needs orientation."),
    defineV3Continuation("qs-code-build", "to resume the implementation recorded in the handoff", "Use when the next implementation step is already clear."),
    defineV3Continuation("qs-plan-clarify", "to resolve the decision recorded as blocking in the handoff", "Use when the handoff identifies an unresolved decision."),
  ]),
  "qs-plan-research": Object.freeze([
    defineV3Continuation("qs-plan-spec", "to apply the verified findings to an actionable specification or dependency-aware tickets", "Best default when the research resolves the implementation question."),
    defineV3Continuation("qs-design-prototype", "to test the most promising finding with a disposable prototype", "Use when evidence still needs practical validation."),
    defineV3Continuation("qs-plan-clarify", "to settle the remaining decision using the research findings", "Use when stakeholders must choose among supported options."),
  ]),
  "qs-design-prototype": Object.freeze([
    defineV3Continuation("qs-plan-spec", "to turn the validated prototype behavior into a production specification or dependency-aware tickets", "Best default after the prototype answers the design question."),
    defineV3Continuation("qs-code-build", "to implement the validated bounded design", "Use when the production boundary is already clear."),
    defineV3Continuation("qs-plan-clarify", "to decide which prototype findings belong in production", "Use when the prototype leaves a material product decision."),
  ]),
  "qs-code-document": Object.freeze([
    defineV3Continuation("qs-review-code", "with target=changes action=review to verify documentation accuracy", "Best default after documentation changes."),
    defineV3Continuation("qs-git-merge", "to verify and integrate the reviewed documentation change", "Use when the documentation is reviewed and ready to publish.", { availability: "success" }),
    defineV3Continuation("qs-flow-handoff", "to hand the documented operational knowledge to another session", "Use when the documentation supports pending follow-up work."),
    defineV3Continuation("qs-code-debug", "to diagnose a failed documentation check or broken example", "Use when documentation verification exposes a reproducible failure.", { recovery: true, availability: "failure" }),
  ]),
  "qs-test-author": Object.freeze([
    defineV3Continuation("qs-test-verify", "to run the relevant suites and report the result without changing code", "Best default after tests are added or improved."),
    defineV3Continuation("qs-review-code", "with target=changes action=review to inspect test quality and scope", "Use when the tests need an independent quality review."),
    defineV3Continuation("qs-git-merge", "to verify and integrate the reviewed test change", "Use when the tests are reviewed and passing.", { availability: "success" }),
    defineV3Continuation("qs-flow-handoff", "to preserve failed test evidence for another session", "Use when another session must continue from the failed tests.", { availability: "failure" }),
  ]),
  "qs-test-verify": Object.freeze([
    defineV3Continuation("qs-git-merge", "to integrate the already-reviewed change after verification passes", "Best default when every required verification passes.", { availability: "success" }),
    defineV3Continuation("qs-code-debug", "to diagnose the first reproducible verification failure", "Use when any required verification fails.", { recovery: true }),
    defineV3Continuation("qs-review-code", "with target=changes action=review to inspect residual risk before integration", "Use when verification passes but review is still required."),
    defineV3Continuation("qs-flow-handoff", "to preserve failed verification evidence for another session", "Use when another session must continue from the failed verification.", { availability: "failure" }),
  ]),
  "qs-learn-teach": Object.freeze([
    defineV3Continuation("qs-plan-research", "to answer the next learning question with primary sources", "Best default for the next evidence-backed learning objective."),
    defineV3Continuation("qs-design-prototype", "to practice the learned concept in a focused prototype", "Use when hands-on validation will deepen understanding."),
    defineV3Continuation("qs-skill-write", "to capture the learned repeatable workflow as a focused skill", "Use when the lesson should become reusable guidance."),
  ]),
  "qs-skill-write": Object.freeze([
    defineV3Continuation("qs-review-code", "with target=changes action=review to inspect the skill and its tests", "Best default after creating or changing a skill."),
    defineV3Continuation("qs-test-verify", "to run the skill's relevant behavior and projection checks", "Use when the skill needs read-only verification."),
    defineV3Continuation("qs-git-merge", "to verify and integrate the reviewed skill change", "Use when the skill is reviewed and all checks pass.", { availability: "success" }),
    defineV3Continuation("qs-flow-handoff", "to preserve failed skill checks for another session", "Use when another session must continue the skill repair.", { availability: "failure" }),
  ]),
});

const V3_EFFORT_MODES = Object.freeze(["quick", "standard", "deep"]);
const V3_REPORT_MODES = Object.freeze(["brief", "full"]);
const V3_PROMPT_STATES = Object.freeze(["complete", "continuation-required", "input-required", "failed"]);
const V3_CODEX_PLUGIN_BY_DISTRIBUTION = Object.freeze({
  core: "qs-skills",
  specialist: "qs-specialists",
});

const V3_EFFORT_POLICY = Object.freeze({
  supported: V3_EFFORT_MODES,
  default: "standard",
});

const V3_REPORT_POLICY = Object.freeze({
  supported: V3_REPORT_MODES,
  default: "brief",
});

function defineV3PublicCommand([name, group, position], distribution) {
  const skill = ACTIVE_SKILLS_BY_NAME.get(name);
  const metadata = V3_PUBLIC_METADATA_OVERRIDES[name] ?? {};
  const continuations = V3_CONTINUATIONS_BY_NAME[name];
  const promptCount = name === "qs-deploy-release" ? 0 : 1;

  if (!skill) throw new Error(`The v3 catalog references unknown public command ${name}.`);
  if (!continuations) throw new Error(`The v3 catalog has no continuation policy for ${name}.`);

  return Object.freeze({
    ...skill,
    ...metadata,
    distribution,
    codexPlugin: V3_CODEX_PLUGIN_BY_DISTRIBUTION[distribution],
    lifecycle: Object.freeze({ group, position }),
    invocationPolicy: skill.userInvoked ? "explicit" : "model",
    effort: V3_EFFORT_POLICY,
    report: V3_REPORT_POLICY,
    continuation: Object.freeze({
      maximumPrompts: promptCount,
      defaultPrompts: 0,
      preferredPromptIndex: promptCount ? 0 : null,
      automaticPublicSkillHops: false,
      promptStates: promptCount ? V3_PROMPT_STATES : Object.freeze([]),
      approvedSkills: Object.freeze(continuations.map((item) => item.name)),
    }),
  });
}

export const V3_PUBLIC_COMMANDS = Object.freeze([
  ...V3_CORE_COMMAND_DEFINITIONS.map((definition) => defineV3PublicCommand(definition, "core")),
  ...V3_SPECIALIST_COMMAND_DEFINITIONS.map(
    (definition) => defineV3PublicCommand(definition, "specialist"),
  ),
]);

export const V3_CORE_SKILLS = Object.freeze(
  V3_PUBLIC_COMMANDS.filter((command) => command.distribution === "core"),
);

export const V3_SPECIALIST_SKILLS = Object.freeze(
  V3_PUBLIC_COMMANDS.filter((command) => command.distribution === "specialist"),
);

function defineV3InternalCapability(name, legacySkillName, owners) {
  return Object.freeze({
    name,
    legacySkillName,
    owners: Object.freeze([...owners]),
  });
}

export const V3_INTERNAL_CAPABILITIES = Object.freeze([
  defineV3InternalCapability(
    "domain-modeling",
    "qs-design-domain",
    ["qs-plan-clarify", "qs-plan-spec", "qs-review-code"],
  ),
  defineV3InternalCapability(
    "module-decomposition",
    "qs-design-modules",
    ["qs-plan-spec", "qs-code-build", "qs-review-code"],
  ),
  defineV3InternalCapability(
    "ticket-decomposition",
    "qs-plan-tickets",
    ["qs-plan-spec"],
  ),
  defineV3InternalCapability(
    "tdd-loop",
    "qs-test-tdd",
    ["qs-code-build"],
  ),
]);

const V3_ABSORBED_SKILLS = Object.freeze({
  "qs-plan-explore": "qs-plan-clarify",
  "qs-plan-interview": "qs-plan-clarify",
  "qs-design-architecture": "qs-review-code",
});

function buildV3SkillDispositions() {
  const dispositions = {};

  for (const command of V3_PUBLIC_COMMANDS) {
    if (!LEGACY_V2_SKILLS.some((skill) => skill.name === command.name)) continue;
    dispositions[command.name] = Object.freeze({
      kind: command.distribution,
      target: command.name,
    });
  }

  for (const capability of V3_INTERNAL_CAPABILITIES) {
    dispositions[capability.legacySkillName] = Object.freeze({
      kind: "internal",
      target: capability.name,
    });
  }

  for (const [name, target] of Object.entries(V3_ABSORBED_SKILLS)) {
    dispositions[name] = Object.freeze({ kind: "absorbed", target });
  }

  return Object.freeze(dispositions);
}

export const V3_SKILL_DISPOSITIONS_BY_NAME = buildV3SkillDispositions();

export const V3_CATALOG = Object.freeze({
  version: 3,
  publicCommands: V3_PUBLIC_COMMANDS,
  coreSkills: V3_CORE_SKILLS,
  specialistSkills: V3_SPECIALIST_SKILLS,
  internalCapabilities: V3_INTERNAL_CAPABILITIES,
  dispositionsByName: V3_SKILL_DISPOSITIONS_BY_NAME,
});

function hasExactValues(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function requireExactNames(actual, expected, label) {
  if (!hasExactValues(actual, expected)) {
    throw new Error(`The v3 ${label} does not match the confirmed command model.`);
  }
}

export function validateV3CatalogModel(model) {
  if (!model || typeof model !== "object" || Array.isArray(model)) {
    throw new Error("The v3 catalog model must be an object.");
  }

  const publicCommands = model.publicCommands;
  const internalCapabilities = model.internalCapabilities;
  const dispositionsByName = model.dispositionsByName;

  if (!Array.isArray(publicCommands)) {
    throw new Error("The v3 catalog must contain public commands.");
  }

  if (model.version !== 3) {
    throw new Error("The v3 catalog must identify version 3.");
  }

  if (!Array.isArray(internalCapabilities)) {
    throw new Error("The v3 catalog must contain internal capabilities.");
  }

  if (!dispositionsByName || typeof dispositionsByName !== "object" || Array.isArray(dispositionsByName)) {
    throw new Error("Every v2 skill must have exactly one v3 disposition.");
  }

  const coreNames = publicCommands
    .filter((command) => command.distribution === "core")
    .map((command) => command.name);
  const specialistNames = publicCommands
    .filter((command) => command.distribution === "specialist")
    .map((command) => command.name);
  const expectedCoreNames = V3_CORE_COMMAND_DEFINITIONS.map(([name]) => name);
  const expectedSpecialistNames = V3_SPECIALIST_COMMAND_DEFINITIONS.map(([name]) => name);

  requireExactNames(coreNames, expectedCoreNames, "core membership");
  requireExactNames(specialistNames, expectedSpecialistNames, "specialist membership");
  requireExactNames(
    model.coreSkills?.map((command) => command.name),
    expectedCoreNames,
    "core projection",
  );
  requireExactNames(
    model.specialistSkills?.map((command) => command.name),
    expectedSpecialistNames,
    "specialist projection",
  );
  requireExactNames(
    internalCapabilities.map((capability) => capability.name),
    ["domain-modeling", "module-decomposition", "ticket-decomposition", "tdd-loop"],
    "internal capability membership",
  );

  const publicNames = publicCommands.map((command) => command.name);
  const publicNameSet = new Set(publicNames);
  const positions = publicCommands.map((command) => command.lifecycle?.position);

  if (publicNameSet.size !== publicNames.length) {
    throw new Error("The v3 public command names must be unique.");
  }

  if (new Set(positions).size !== positions.length) {
    throw new Error("The v3 lifecycle positions must be unique.");
  }

  if (positions.some((position, index) => !Number.isInteger(position) || position !== (index + 1) * 10)) {
    throw new Error("The v3 lifecycle positions must follow the confirmed catalog order.");
  }

  const activeNames = LEGACY_V2_SKILLS.map((skill) => skill.name).sort();
  const legacyNameSet = new Set(activeNames);
  const dispositionNames = Object.keys(dispositionsByName).sort();

  if (!hasExactValues(dispositionNames, activeNames)) {
    throw new Error("Every v2 skill must have exactly one v3 disposition.");
  }

  const expectedDefinitions = [
    ...V3_CORE_COMMAND_DEFINITIONS,
    ...V3_SPECIALIST_COMMAND_DEFINITIONS,
  ];

  for (const [index, command] of publicCommands.entries()) {
    if (!ACTIVE_SKILLS_BY_NAME.has(command.name)) {
      throw new Error(`The v3 public command ${command.name} is not in the active skill catalog.`);
    }

    const [, expectedGroup, expectedPosition] = expectedDefinitions[index];
    if (command.lifecycle?.group !== expectedGroup || command.lifecycle.position !== expectedPosition) {
      throw new Error(`The v3 public command ${command.name} needs lifecycle metadata.`);
    }

    if (!hasExactValues(command.effort?.supported, V3_EFFORT_MODES)
      || command.effort?.default !== "standard") {
      throw new Error(`The v3 public command ${command.name} has invalid effort modes.`);
    }

    if (!hasExactValues(command.report?.supported, V3_REPORT_MODES)
      || command.report?.default !== "brief") {
      throw new Error(`The v3 public command ${command.name} has invalid report modes.`);
    }

    const currentSkill = ACTIVE_SKILLS_BY_NAME.get(command.name);
    const expectedInvocationPolicy = currentSkill.userInvoked ? "explicit" : "model";
    if (command.invocationPolicy !== expectedInvocationPolicy) {
      throw new Error(`The v3 public command ${command.name} has an invalid invocation policy.`);
    }

    if (command.codexPlugin !== V3_CODEX_PLUGIN_BY_DISTRIBUTION[command.distribution]) {
      throw new Error(`The v3 public command ${command.name} has an invalid Codex plugin literal.`);
    }

    const expectedContinuations = V3_CONTINUATIONS_BY_NAME[command.name];
    const expectedNames = expectedContinuations.map((item) => item.name);
    const expectedPromptCount = command.name === "qs-deploy-release" ? 0 : 1;
    if (expectedContinuations.length < expectedPromptCount
      || expectedContinuations.length > (expectedPromptCount === 0 ? 0 : 4)
      || command.continuation?.maximumPrompts !== expectedPromptCount
      || command.continuation?.defaultPrompts !== 0) {
      throw new Error(`The v3 public command ${command.name} must expose its ranked prompt count.`);
    }

    if (!hasExactValues(command.continuation.approvedSkills, expectedNames)
      || expectedNames.some((name) => !publicNameSet.has(name) || name === command.name)
      || new Set(expectedNames).size !== expectedNames.length) {
      throw new Error(`The v3 public command ${command.name} has invalid approved continuations.`);
    }

    if (command.distribution === "core" && expectedNames.some((name) => {
      const target = publicCommands.find((candidate) => candidate.name === name);
      return target?.distribution !== "core";
    })) {
      throw new Error(`The core command ${command.name} must not depend on a specialist continuation.`);
    }

    if (expectedContinuations.some((item) => item.reason.length > 100 || item.instruction.length > 120)) {
      throw new Error(`The v3 public command ${command.name} has an overly wordy continuation.`);
    }

    if (expectedContinuations.some((item) => !["always", "success", "failure"].includes(item.availability))) {
      throw new Error(`The v3 public command ${command.name} has invalid continuation availability.`);
    }

    if (command.continuation.automaticPublicSkillHops !== false
      || command.continuation.preferredPromptIndex !== (expectedPromptCount ? 0 : null)
      || !hasExactValues(
        command.continuation.promptStates,
        expectedPromptCount ? V3_PROMPT_STATES : [],
      )) {
      throw new Error(`The v3 public command ${command.name} has an invalid continuation policy.`);
    }

    const disposition = dispositionsByName[command.name];
    if (legacyNameSet.has(command.name)) {
      if (disposition?.kind !== command.distribution || disposition.target !== command.name) {
        throw new Error(`The v3 public command ${command.name} has invalid package membership.`);
      }
    } else if (disposition !== undefined) {
      throw new Error(`The v3-only command ${command.name} must not appear in the v2 disposition map.`);
    }
  }

  for (const capability of internalCapabilities) {
    if (!LEGACY_V2_SKILLS_BY_NAME.has(capability.legacySkillName) || publicNameSet.has(capability.legacySkillName)) {
      throw new Error(`The v3 internal capability ${capability.name} must replace one non-public v2 skill.`);
    }

    if (!Array.isArray(capability.owners)
      || capability.owners.length === 0
      || capability.owners.some((owner) => !publicNameSet.has(owner))) {
      throw new Error(`The v3 internal capability ${capability.name} must be owned by public root commands.`);
    }

    const disposition = dispositionsByName[capability.legacySkillName];
    if (disposition?.kind !== "internal" || disposition.target !== capability.name) {
      throw new Error(`The v3 internal capability ${capability.name} has an invalid disposition.`);
    }
  }

  for (const [name, target] of Object.entries(V3_ABSORBED_SKILLS)) {
    const disposition = dispositionsByName[name];
    if (disposition?.kind !== "absorbed" || disposition.target !== target || !publicNameSet.has(target)) {
      throw new Error(`The absorbed v2 command ${name} must target one v3 public root command.`);
    }
  }

  return true;
}

validateV3CatalogModel(V3_CATALOG);

// QuickStark v3 is the active promoted surface. The complete v2 inventory remains
// private to this module only so migration coverage can prove every old command has
// exactly one disposition without accidentally re-exporting it as installable.
export const SKILLS = V3_PUBLIC_COMMANDS;

export const SKILLS_BY_NAME = new Map(
  SKILLS.map((skill) => [skill.name, skill]),
);

export function codexSkillLiteral(name) {
  const skill = SKILLS_BY_NAME.get(name);

  if (!skill) throw new Error(`/${name} is not an active QuickStark v3 command.`);

  return `$${skill.codexPlugin}:${skill.name}`;
}

export const UPSTREAM_SKILLS = Object.freeze(
  SKILLS.filter((skill) => skill.upstreamName !== null),
);

function defineModelGuidance(model, thinking, reason) {
  return Object.freeze({ model, thinking, reason });
}

export const MODEL_GUIDANCE_BY_NAME = Object.freeze({
  "qs-help": defineModelGuidance(
    "gpt-5.6-terra", "low", "Workflow routing usually needs quick, focused orientation.",
  ),
  "qs-setup": defineModelGuidance(
    "gpt-5.6-terra", "medium", "Project setup benefits from careful, bounded configuration checks.",
  ),
  "qs-plan-clarify": defineModelGuidance(
    "gpt-5.6-sol", "high", "Clarification benefits from deeper reasoning about requirements and trade-offs.",
  ),
  "qs-plan-explore": defineModelGuidance(
    "gpt-5.6-sol", "high", "Open-ended exploration benefits from examining several plausible directions.",
  ),
  "qs-plan-interview": defineModelGuidance(
    "gpt-5.6-sol", "high", "A focused interview benefits from tracking dependent decisions and uncertainty.",
  ),
  "qs-plan-spec": defineModelGuidance(
    "gpt-5.6-sol", "high", "A specification benefits from reconciling boundaries, decisions, and requirements.",
  ),
  "qs-plan-tickets": defineModelGuidance(
    "gpt-5.6-sol", "high", "Ticket decomposition benefits from reasoning about scope and dependencies.",
  ),
  "qs-plan-roadmap": defineModelGuidance(
    "gpt-5.6-sol", "xhigh", "A large or uncertain roadmap benefits from deeper dependency analysis.",
  ),
  "qs-plan-research": defineModelGuidance(
    "gpt-5.6-sol", "high", "Research benefits from comparing evidence, uncertainty, and primary sources.",
  ),
  "qs-design-prototype": defineModelGuidance(
    "gpt-5.6-terra", "high", "A focused prototype benefits from practical implementation and design iteration.",
  ),
  "qs-design-domain": defineModelGuidance(
    "gpt-5.6-sol", "high", "Domain modeling benefits from precise concepts, boundaries, and relationships.",
  ),
  "qs-design-modules": defineModelGuidance(
    "gpt-5.6-sol", "high", "Module design benefits from carefully reasoning about interfaces and seams.",
  ),
  "qs-design-architecture": defineModelGuidance(
    "gpt-5.6-sol", "xhigh", "Architecture analysis benefits from deeper cross-module and risk assessment.",
  ),
  "qs-code-build": defineModelGuidance(
    "gpt-5.6-terra", "high", "Implementation benefits from sustained reasoning and direct verification.",
  ),
  "qs-code-document": defineModelGuidance(
    "gpt-5.6-terra", "medium", "Verified documentation usually benefits from focused code-to-document comparison.",
  ),
  "qs-code-debug": defineModelGuidance(
    "gpt-5.6-sol", "high", "Debugging benefits from tracing failure evidence back to its actual cause.",
  ),
  "qs-test-tdd": defineModelGuidance(
    "gpt-5.6-terra", "high", "Test-driven work benefits from reasoning through behavior and regression seams.",
  ),
  "qs-test-author": defineModelGuidance(
    "gpt-5.6-terra", "high", "Focused test authoring benefits from reasoning about observable behavior and stable seams.",
  ),
  "qs-test-verify": defineModelGuidance(
    "gpt-5.6-terra", "high", "Verification matrices benefit from deliberate command selection and truthful result classification.",
  ),
  "qs-review-code": defineModelGuidance(
    "gpt-5.6-sol", "high", "Code review benefits from deeper correctness, security, and standards analysis.",
  ),
  "qs-git-merge": defineModelGuidance(
    "gpt-5.6-sol", "high", "GitHub integration benefits from verifying branch state, publication, pull requests, and competing changes.",
  ),
  "qs-flow-triage": defineModelGuidance(
    "gpt-5.6-terra", "medium", "Issue triage usually benefits from focused categorization and prioritization.",
  ),
  "qs-flow-handoff": defineModelGuidance(
    "gpt-5.6-terra", "medium", "A handoff benefits from concise preservation of verified state and decisions.",
  ),
  "qs-learn-teach": defineModelGuidance(
    "gpt-5.6-terra", "medium", "Guided learning benefits from clear explanations and incremental practice.",
  ),
  "qs-skill-write": defineModelGuidance(
    "gpt-5.6-sol", "high", "Skill authoring benefits from predictable instructions and invocation boundaries.",
  ),
  "qs-deploy-release": defineModelGuidance(
    "gpt-5.6-terra", "high", "An approved release benefits from deliberate prerequisite and smoke-test checks.",
  ),
});

export const LEGACY_NEXT_SKILLS_BY_NAME = Object.freeze({
  "qs-help": [
    {
      name: "qs-setup",
      reason: "Configure a project that has not used the collection before.",
    },
    {
      name: "qs-plan-clarify",
      reason: "Clarify requirements and durable decisions for new work.",
    },
    {
      name: "qs-design-architecture",
      reason: "Identify and prioritize an existing codebase's refactoring opportunities.",
    },
  ],
  "qs-setup": [
    {
      name: "qs-plan-clarify",
      reason: "Start a new feature after configuring the project.",
    },
    {
      name: "qs-flow-triage",
      reason: "Sort incoming work using the newly configured tracker.",
    },
    {
      name: "qs-design-architecture",
      reason: "Inspect an existing project before starting a refactor.",
    },
  ],
  "qs-plan-clarify": [
    {
      name: "qs-plan-spec",
      reason: "Record the agreed requirements as an actionable specification.",
    },
    {
      name: "qs-plan-research",
      reason: "Resolve an open question that needs external or primary-source evidence.",
    },
    {
      name: "qs-design-prototype",
      reason: "Test a design question that conversation alone cannot settle.",
    },
  ],
  "qs-plan-explore": [
    {
      name: "qs-plan-clarify",
      reason: "Ground the explored idea in an actual codebase and durable decisions.",
    },
    {
      name: "qs-plan-research",
      reason: "Investigate assumptions or unknowns exposed during exploration.",
    },
    {
      name: "qs-plan-spec",
      reason: "Capture a sufficiently settled idea as a specification.",
    },
  ],
  "qs-plan-interview": [
    {
      name: "qs-plan-clarify",
      reason: "Turn interview answers into documented project decisions.",
    },
    {
      name: "qs-design-domain",
      reason: "Resolve terminology or domain concepts exposed by the interview.",
    },
    {
      name: "qs-plan-spec",
      reason: "Write a specification once the outstanding decisions are settled.",
    },
  ],
  "qs-plan-spec": [
    {
      name: "qs-plan-tickets",
      reason: "Break a substantial specification into dependency-aware work.",
    },
    {
      name: "qs-code-build",
      reason: "Implement a small, sufficiently clear specification directly.",
    },
    {
      name: "qs-design-modules",
      reason: "Resolve an important interface or module boundary before implementation.",
    },
  ],
  "qs-plan-tickets": [
    {
      name: "qs-code-build",
      reason: "Implement the next unblocked ticket.",
    },
    {
      name: "qs-test-tdd",
      reason: "Establish the agreed test seam for a ticket before implementation.",
    },
    {
      name: "qs-flow-handoff",
      reason: "Transfer the next ticket and its context into a fresh session.",
    },
  ],
  "qs-plan-roadmap": [
    {
      name: "qs-plan-research",
      reason: "Answer a blocking research question identified by the roadmap.",
    },
    {
      name: "qs-design-prototype",
      reason: "Resolve a roadmap decision with a disposable prototype.",
    },
    {
      name: "qs-plan-spec",
      reason: "Convert resolved roadmap decisions into an implementation specification.",
    },
  ],
  "qs-plan-research": [
    {
      name: "qs-plan-clarify",
      reason: "Use the research findings to settle the remaining requirements.",
    },
    {
      name: "qs-design-prototype",
      reason: "Test a promising research finding with a focused prototype.",
    },
    {
      name: "qs-plan-spec",
      reason: "Incorporate verified findings into an actionable specification.",
    },
  ],
  "qs-design-prototype": [
    {
      name: "qs-design-modules",
      reason: "Turn the validated prototype into a clean module or interface design.",
    },
    {
      name: "qs-plan-clarify",
      reason: "Confirm which prototype findings should shape the real solution.",
    },
    {
      name: "qs-plan-spec",
      reason: "Capture the selected prototype behavior before production implementation.",
    },
  ],
  "qs-design-domain": [
    {
      name: "qs-design-modules",
      reason: "Design software boundaries using the clarified domain vocabulary.",
    },
    {
      name: "qs-plan-clarify",
      reason: "Use the domain model to settle feature or refactoring requirements.",
    },
    {
      name: "qs-plan-spec",
      reason: "Write the specification in the project's agreed domain language.",
    },
  ],
  "qs-design-modules": [
    {
      name: "qs-test-tdd",
      reason: "Protect the selected module seam with a behavior-first test.",
    },
    {
      name: "qs-plan-spec",
      reason: "Document a significant interface or refactoring decision.",
    },
    {
      name: "qs-code-build",
      reason: "Implement the agreed module design.",
    },
  ],
  "qs-design-architecture": [
    {
      name: "qs-design-modules",
      reason: "Design the interface and seam for the selected architecture candidate.",
    },
    {
      name: "qs-plan-clarify",
      reason: "Confirm the refactor's scope, constraints, and expected outcome.",
    },
    {
      name: "qs-plan-spec",
      reason: "Document a selected, nontrivial refactoring before implementation.",
    },
  ],
  "qs-code-build": [
    {
      name: "qs-test-tdd",
      reason: "Add or complete behavior-focused coverage for the implemented change.",
    },
    {
      name: "qs-review-code",
      reason: "Review the implementation against its requirements and standards.",
    },
    {
      name: "qs-git-merge",
      reason: "Integrate the reviewed change and verify its actual branch, pull request, and GitHub publication.",
    },
  ],
  "qs-code-document": [
    {
      name: "qs-review-code",
      reason: "Verify that the documentation accurately reflects the actual implementation.",
    },
    {
      name: "qs-flow-handoff",
      reason: "Hand documented operational knowledge and remaining work to the next session.",
    },
    {
      name: "qs-deploy-release",
      reason: "Use the verified deployment documentation when a release is explicitly approved.",
    },
  ],
  "qs-code-debug": [
    {
      name: "qs-test-tdd",
      reason: "Lock the diagnosed failure down with a regression test.",
    },
    {
      name: "qs-review-code",
      reason: "Review the fix for correctness and unintended regressions.",
    },
    {
      name: "qs-design-architecture",
      reason: "Investigate architectural friction that caused the recurring failure.",
    },
  ],
  "qs-test-tdd": [
    {
      name: "qs-code-build",
      reason: "Implement the smallest change that makes the verified test pass.",
    },
    {
      name: "qs-review-code",
      reason: "Review the completed behavior and the quality of its tests.",
    },
    {
      name: "qs-git-merge",
      reason: "Integrate the behavior-first change after its tests and independent review pass.",
    },
  ],
  "qs-review-code": [
    {
      name: "qs-code-build",
      reason: "Address actionable findings before the change is considered complete.",
    },
    {
      name: "qs-git-merge",
      reason: "Verify the branch, pull request, integration, and GitHub publication required for the reviewed change.",
    },
    {
      name: "qs-deploy-release",
      reason: "Release an approved change after all required checks pass.",
    },
  ],
  "qs-git-merge": [
    {
      name: "qs-test-tdd",
      reason: "Verify that Git integration or conflict resolution preserved observable behavior.",
    },
    {
      name: "qs-review-code",
      reason: "Review the integrated changes, actual branch state, and any conflict resolution.",
    },
    {
      name: "qs-deploy-release",
      reason: "Run the documented release workflow only after GitHub publication is verified and deployment is explicitly approved.",
    },
  ],
  "qs-flow-triage": [
    {
      name: "qs-code-debug",
      reason: "Reproduce and diagnose an incoming bug report.",
    },
    {
      name: "qs-plan-roadmap",
      reason: "Map a large or ambiguous incoming request before building it.",
    },
    {
      name: "qs-code-build",
      reason: "Implement an already clear, agent-ready issue.",
    },
  ],
  "qs-flow-handoff": [
    {
      name: "qs-help",
      reason: "Orient the receiving session around the next appropriate workflow.",
    },
    {
      name: "qs-code-build",
      reason: "Resume a clearly documented implementation or ticket.",
    },
    {
      name: "qs-plan-clarify",
      reason: "Resume an unresolved decision before continuing implementation.",
    },
  ],
  "qs-learn-teach": [
    {
      name: "qs-plan-research",
      reason: "Find authoritative sources for the next learning objective.",
    },
    {
      name: "qs-design-prototype",
      reason: "Practice the new concept through a focused working example.",
    },
    {
      name: "qs-skill-write",
      reason: "Capture a repeatable learned workflow as an agent skill.",
    },
  ],
  "qs-skill-write": [
    {
      name: "qs-plan-interview",
      reason: "Clarify the skill's boundaries and expected behavior.",
    },
    {
      name: "qs-review-code",
      reason: "Review skill scripts, examples, and implementation changes.",
    },
    {
      name: "qs-code-document",
      reason: "Document the verified skill behavior, actual files, and installation workflow.",
    },
  ],
  "qs-deploy-release": [
    {
      name: "qs-review-code",
      reason: "Resolve a failed pre-deployment review or outstanding release concern.",
    },
    {
      name: "qs-code-debug",
      reason: "Diagnose a failed deployment or smoke test.",
    },
    {
      name: "qs-flow-handoff",
      reason: "Hand release results and remaining follow-up to the next operator.",
    },
  ],
});

export const NEXT_SKILLS_BY_NAME = Object.freeze(Object.fromEntries(
  V3_PUBLIC_COMMANDS.map((command) => {
    const continuations = V3_CONTINUATIONS_BY_NAME[command.name];
    for (const continuation of continuations) {
      if (!SKILLS_BY_NAME.has(continuation.name)) {
        throw new Error(`/${command.name} recommends unavailable v3 command /${continuation.name}.`);
      }
    }

    return [command.name, continuations];
  }),
));
