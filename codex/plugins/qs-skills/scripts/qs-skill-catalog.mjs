export const COLLECTION_PREFIX = "qs";
export const COLLECTION_NAME = "QuickStark Skills";
export const PERSONAL_REPOSITORY = "https://github.com/quickstark/skills";
export const UPSTREAM_REPOSITORY = "https://github.com/mattpocock/skills";

export const SKILLS = Object.freeze([
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
    shortDescription: "Review code for correctness and requirements",
    prompt: "review these changes for correctness, standards, and requirements",
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

function defineReadoutProfile(title, signal, visualization, sections, labels = {}) {
  return Object.freeze({
    title,
    signal,
    visualization,
    sections: Object.freeze([...sections]),
    labels: Object.freeze({ ...labels }),
  });
}

export const READOUT_PROFILES_BY_NAME = Object.freeze({
  "qs-help": defineReadoutProfile(
    "Workflow recommendation",
    "Choose the right next workflow",
    "brief",
    ["decisions", "findings", "outputs", "checks"],
    { decisions: "Recommended workflow", findings: "Selection rationale" },
  ),
  "qs-setup": defineReadoutProfile(
    "Setup readiness",
    "Verify actual project configuration",
    "checks",
    ["checks", "outputs", "decisions", "findings"],
    { checks: "Configuration checks", outputs: "Configured artifacts" },
  ),
  "qs-plan-clarify": defineReadoutProfile(
    "Decision brief",
    "Make resolved decisions easy to scan",
    "brief",
    ["decisions", "findings", "outputs", "checks"],
    { decisions: "Resolved decisions", findings: "Open questions" },
  ),
  "qs-plan-explore": defineReadoutProfile(
    "Opportunity canvas",
    "Compare real opportunities and concerns",
    "bars",
    ["findings", "decisions", "outputs", "checks"],
    { findings: "Opportunities and constraints", decisions: "Promising directions" },
  ),
  "qs-plan-interview": defineReadoutProfile(
    "Interview synthesis",
    "Summarize answered and open decisions",
    "brief",
    ["decisions", "findings", "outputs", "checks"],
    { decisions: "Answers and decisions", findings: "Questions to resolve" },
  ),
  "qs-plan-spec": defineReadoutProfile(
    "Specification blueprint",
    "Show verified requirements and boundaries",
    "flow",
    ["decisions", "outputs", "findings", "checks"],
    { decisions: "Agreed requirements", outputs: "Specification artifacts" },
  ),
  "qs-plan-tickets": defineReadoutProfile(
    "Implementation ticket board",
    "Show actual implementation slices and dependencies",
    "flow",
    ["outputs", "decisions", "findings", "checks"],
    { outputs: "Tracked implementation slices", decisions: "Ordering decisions" },
  ),
  "qs-plan-roadmap": defineReadoutProfile(
    "Delivery roadmap",
    "Summarize actual delivery decisions in sequence",
    "flow",
    ["decisions", "outputs", "findings", "checks"],
    { decisions: "Decision sequence", outputs: "Roadmap artifacts" },
  ),
  "qs-plan-research": defineReadoutProfile(
    "Research brief",
    "Foreground observed evidence and conclusions",
    "bars",
    ["findings", "decisions", "outputs", "checks"],
    { findings: "Evidence", decisions: "Evidence-backed conclusions", outputs: "Research artifacts" },
  ),
  "qs-design-prototype": defineReadoutProfile(
    "Prototype comparison",
    "Compare only designs that were actually explored",
    "matrix",
    ["outputs", "findings", "decisions", "checks"],
    { outputs: "Prototype artifacts", findings: "Observed design trade-offs", decisions: "Selected direction" },
  ),
  "qs-design-domain": defineReadoutProfile(
    "Domain model",
    "Make resolved concepts and shared vocabulary visible",
    "map",
    ["findings", "decisions", "outputs", "checks"],
    { findings: "Shared vocabulary", decisions: "Domain boundaries", outputs: "Domain artifacts" },
  ),
  "qs-design-modules": defineReadoutProfile(
    "Module blueprint",
    "Show documented module boundaries and interfaces",
    "map",
    ["decisions", "findings", "outputs", "checks"],
    { decisions: "Module boundaries", findings: "Interface observations", outputs: "Design artifacts" },
  ),
  "qs-design-architecture": defineReadoutProfile(
    "Architecture assessment",
    "Surface real architectural risks and decisions",
    "map",
    ["findings", "decisions", "outputs", "checks"],
    { findings: "Architectural observations", decisions: "Architecture decisions", outputs: "Architecture artifacts" },
  ),
  "qs-code-build": defineReadoutProfile(
    "Delivery summary",
    "Show actual deliverables and verified implementation",
    "flow",
    ["outputs", "checks", "decisions", "findings"],
    { outputs: "Deliverables", checks: "Verification", decisions: "Implementation decisions" },
  ),
  "qs-code-document": defineReadoutProfile(
    "Documentation coverage",
    "Show verified documentation changes and accuracy checks",
    "checks",
    ["outputs", "checks", "findings", "decisions"],
    {
      outputs: "Documented artifacts",
      checks: "Documentation validation",
      findings: "Documentation coverage",
      decisions: "Documentation decisions",
    },
  ),
  "qs-code-debug": defineReadoutProfile(
    "Diagnosis trace",
    "Connect the observed failure to its verified fix",
    "flow",
    ["findings", "decisions", "checks", "outputs"],
    { findings: "Observed failure", decisions: "Diagnosis and repair", checks: "Regression verification" },
  ),
  "qs-test-tdd": defineReadoutProfile(
    "Test results",
    "Summarize only tests and checks that actually ran",
    "checks",
    ["checks", "outputs", "findings", "decisions"],
    { checks: "Verification", outputs: "Test artifacts", findings: "Observed behavior" },
  ),
  "qs-review-code": defineReadoutProfile(
    "Review findings",
    "Distinguish actual standards and specification findings",
    "matrix",
    ["findings", "checks", "decisions", "outputs"],
    { findings: "Review matrix", checks: "Review verification", decisions: "Review decisions" },
  ),
  "qs-git-merge": defineReadoutProfile(
    "GitHub integration",
    "Show verified Git integration, publication, and conflict resolution",
    "flow",
    ["findings", "decisions", "checks", "outputs"],
    { findings: "Git and GitHub state", decisions: "Integration decisions", checks: "Integration verification" },
  ),
  "qs-flow-triage": defineReadoutProfile(
    "Issue triage",
    "Group only issues that were actually assessed",
    "matrix",
    ["findings", "decisions", "outputs", "checks"],
    { findings: "Assessed issues", decisions: "Triage decisions", outputs: "Tracked outcomes" },
  ),
  "qs-flow-handoff": defineReadoutProfile(
    "Session handoff",
    "Expose real current state and remaining work",
    "brief",
    ["decisions", "findings", "outputs", "checks"],
    { decisions: "Continuation decisions", findings: "Current state", outputs: "Handoff artifacts" },
  ),
  "qs-learn-teach": defineReadoutProfile(
    "Learning pathway",
    "Show actual concepts and recommended learning sequence",
    "flow",
    ["findings", "decisions", "outputs", "checks"],
    { findings: "Concepts and observations", decisions: "Learning sequence", outputs: "Learning materials" },
  ),
  "qs-skill-write": defineReadoutProfile(
    "Skill authoring review",
    "Highlight created skill artifacts and validation",
    "checks",
    ["outputs", "checks", "decisions", "findings"],
    { outputs: "Authored skill artifacts", checks: "Skill validation", decisions: "Authoring decisions" },
  ),
  "qs-deploy-release": defineReadoutProfile(
    "Release readiness",
    "Surface the verified release gates and deployment result",
    "checks",
    ["checks", "outputs", "decisions", "findings"],
    { checks: "Release gates", outputs: "Deployed artifacts", decisions: "Release decisions" },
  ),
});

export const UPSTREAM_SKILLS = Object.freeze(
  SKILLS.filter((skill) => skill.upstreamName !== null),
);

export const SKILLS_BY_NAME = new Map(
  SKILLS.map((skill) => [skill.name, skill]),
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

export const NEXT_SKILLS_BY_NAME = Object.freeze({
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
