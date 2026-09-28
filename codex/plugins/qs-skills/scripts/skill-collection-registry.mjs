import {
  NEXT_SKILLS_BY_NAME,
  V3_CORE_SKILLS,
  V3_SPECIALIST_SKILLS,
} from "./qs-skill-catalog.mjs";
import {
  PS_COLLECTION,
  PS_PUBLIC_COMMANDS,
} from "./ps-skill-catalog.mjs";
import { ADVANCED_PUBLIC_COMMANDS } from "./advanced-skill-catalog.mjs";
import { FRONTEND_PUBLIC_COMMANDS } from "./frontend-skill-catalog.mjs";
import { VIDEO_PUBLIC_COMMANDS } from "./video-skill-catalog.mjs";
import { EXECUTION_PUBLIC_COMMANDS } from "./execution-skill-catalog.mjs";

function freezeRoutes(routes) {
  return Object.freeze(routes.map((route) => Object.freeze({ ...route })));
}

export const SPEC_PROGRESS_COMMAND_NAMES = Object.freeze([
  "qs-plan-clarify", "qs-plan-roadmap", "qs-plan-spec", "qs-code-build",
  "qs-code-debug", "qs-review-code", "qs-git-merge", "qs-deploy-release",
  "qs-flow-triage", "qs-flow-handoff", "qs-plan-research", "qs-design-prototype",
  "qs-code-document", "qs-test-author", "qs-test-verify", "qs-skill-write", "qs-deploy-prompt",
  "ps-blast-radius", "ps-runtime-forensics", "ps-trace-forensics",
  "ps-create-verification-skill", "ps-maintain-verification-skill",
  "ps-skill-eval", "ps-hillclimb", "ps-visual-parity", "ps-pr-babysit",
  "ps-worktree-cleanup",
]);
const SPEC_PROGRESS_COMMAND_NAME_SET = new Set(SPEC_PROGRESS_COMMAND_NAMES);

const PREFERRED_COMPOSITE_WORKFLOW_BY_COMMAND = Object.freeze({});

const PRIMARY_HELP_ROUTING = Object.freeze({
  kind: "available-public-command",
  referenceFile: "ROUTING.md",
  availability: "observed-host-literal",
  automaticInvocation: false,
});

function defineQsCommand(command) {
  const routes = NEXT_SKILLS_BY_NAME[command.name];
  const collectionId = command.distribution === "core" ? "qs-skills" : "qs-specialists";
  return Object.freeze({
    ...command,
    collectionId,
    ...(command.name === "qs-help" ? { primaryRouting: PRIMARY_HELP_ROUTING } : {}),
    packageName: collectionId,
    codexPlugin: collectionId,
    codexLiteral: `$${collectionId}:${command.name}`,
    claudeLiteral: `/${command.name}`,
    resultContext: Object.freeze({
      specProgress: SPEC_PROGRESS_COMMAND_NAME_SET.has(command.name),
    }),
    continuation: Object.freeze({
      ...command.continuation,
      normal: freezeRoutes(routes.filter((route) => route.availability !== "failure")),
      failure: freezeRoutes(routes
        .filter((route) => route.availability !== "success")
        .sort((left, right) => Number(right.recovery) - Number(left.recovery))),
      ...(PREFERRED_COMPOSITE_WORKFLOW_BY_COMMAND[command.name]
        ? { preferredCompositeWorkflow: PREFERRED_COMPOSITE_WORKFLOW_BY_COMMAND[command.name] }
        : {}),
    }),
  });
}

function definePsCommand(command) {
  return Object.freeze({
    ...command,
    collectionId: PS_COLLECTION.packageName,
    codexLiteral: `$${PS_COLLECTION.codexPlugin}:${command.name}`,
    claudeLiteral: `/${command.name}`,
    resultContext: Object.freeze({
      specProgress: SPEC_PROGRESS_COMMAND_NAME_SET.has(command.name),
    }),
    continuation: Object.freeze({
      ...command.continuation,
      ...(PREFERRED_COMPOSITE_WORKFLOW_BY_COMMAND[command.name]
        ? { preferredCompositeWorkflow: PREFERRED_COMPOSITE_WORKFLOW_BY_COMMAND[command.name] }
        : {}),
    }),
  });
}

const QS_CORE_COMMANDS = Object.freeze(V3_CORE_SKILLS.map(defineQsCommand));
const QS_SPECIALIST_COMMANDS = Object.freeze(V3_SPECIALIST_SKILLS.map(defineQsCommand));
const PS_COMMANDS = Object.freeze(PS_PUBLIC_COMMANDS.map(definePsCommand));

export const LEGACY_PUBLIC_COMMANDS = Object.freeze([
  ...QS_CORE_COMMANDS,
  ...QS_SPECIALIST_COMMANDS,
  ...PS_COMMANDS,
]);

function defineCompositeWorkflow(id, steps) {
  return Object.freeze({
    id,
    steps: Object.freeze(steps),
    stopStatuses: Object.freeze(["continuation-required", "input-required", "failed"]),
    perRootReports: true,
    automaticPublicSkillHops: false,
  });
}

export const COMPOSITE_WORKFLOWS = Object.freeze([
  defineCompositeWorkflow("build-review-test-merge", ["qs-code-build", "qs-review-code", "qs-test-verify", "qs-git-merge"]),
  defineCompositeWorkflow("review-test-merge", ["qs-review-code", "qs-test-verify", "qs-git-merge"]),
  defineCompositeWorkflow("test-merge", ["qs-test-verify", "qs-git-merge"]),
]);

export const COMPOSITE_WORKFLOWS_BY_ID = new Map(
  COMPOSITE_WORKFLOWS.map((workflow) => [workflow.id, workflow]),
);

export function renderCompositeWorkflowPrompt(id, { harness = "codex", context } = {}) {
  const workflow = COMPOSITE_WORKFLOWS_BY_ID.get(id);
  if (!workflow) throw new Error(`Unknown composite workflow: ${id}.`);
  if (!["codex", "claude", "pi"].includes(harness)) throw new Error(`Unsupported composite workflow harness: ${harness}.`);
  const literal = harness === "codex"
    ? codexPublicSkillLiteral
    : harness === "claude"
      ? claudePublicSkillLiteral
      : piPublicSkillLiteral;
  const [first, ...remaining] = workflow.steps.map(literal);
  const sequence = [first, ...remaining.map((item) => `then ${item}`)].join(", ");
  return [
    `${sequence}.`,
    context ? `Shared objective: ${context}` : null,
    "Treat every step as a separate public root with its own completion report and authority boundary.",
    `Continue in this session only after a Complete result; stop on ${workflow.stopStatuses.join(", ")}.`,
    "This combined prompt does not grant commit, merge, push, release, deployment, installation, or other mutation authority unless the shared objective explicitly grants that exact action.",
  ].filter(Boolean).join(" ");
}

function defineCollection({
  id,
  displayName,
  packageName,
  codexPlugin,
  claudePackageRoot,
  codexPackageRoot,
  piPackageRoot,
  canonicalRoot,
  documentationRoot,
  publicCommands,
}) {
  return Object.freeze({
    id,
    displayName,
    packageName,
    codexPlugin,
    claudePackageRoot,
    codexPackageRoot,
    piPackageRoot,
    canonicalRoot,
    documentationRoot,
    publicCommands: Object.freeze(publicCommands.map((command) => command.name)),
  });
}

export const LEGACY_SKILL_COLLECTIONS = Object.freeze([
  defineCollection({
    id: "qs-skills",
    displayName: "QuickStark Skills",
    packageName: "qs-skills",
    codexPlugin: "qs-skills",
    claudePackageRoot: ".",
    codexPackageRoot: "codex/plugins/qs-skills",
    piPackageRoot: "pi/packages/qs-skills",
    canonicalRoot: "skills",
    documentationRoot: "docs",
    publicCommands: QS_CORE_COMMANDS,
  }),
  defineCollection({
    id: "qs-specialists",
    displayName: "QuickStark Specialists",
    packageName: "qs-specialists",
    codexPlugin: "qs-specialists",
    claudePackageRoot: "packages/qs-specialists",
    codexPackageRoot: "codex/plugins/qs-specialists",
    piPackageRoot: "pi/packages/qs-specialists",
    canonicalRoot: "skills",
    documentationRoot: "docs",
    publicCommands: QS_SPECIALIST_COMMANDS,
  }),
  defineCollection({
    id: PS_COLLECTION.packageName,
    displayName: PS_COLLECTION.name,
    packageName: PS_COLLECTION.packageName,
    codexPlugin: PS_COLLECTION.codexPlugin,
    claudePackageRoot: PS_COLLECTION.claudePackageRoot,
    codexPackageRoot: PS_COLLECTION.codexPackageRoot,
    piPackageRoot: "pi/packages/ps-skills",
    canonicalRoot: PS_COLLECTION.canonicalRoot,
    documentationRoot: PS_COLLECTION.documentationRoot,
    publicCommands: PS_COMMANDS,
  }),
]);

// Candidate metadata is explicit and inert. Ordinary package commands keep the
// current registry until the adoption acceptance and migration gates pass.
const ADVANCED_COMMANDS = Object.freeze(ADVANCED_PUBLIC_COMMANDS.map((command) => Object.freeze({
  ...command, collectionId: "qs-advanced",
  resultContext: Object.freeze({ specProgress: !["qs-how", "qs-why"].includes(command.name) }),
})));
export const TARGET_PUBLIC_COMMANDS = Object.freeze([
  ...QS_CORE_COMMANDS, ...QS_SPECIALIST_COMMANDS, ...ADVANCED_COMMANDS,
  ...FRONTEND_PUBLIC_COMMANDS, ...VIDEO_PUBLIC_COMMANDS, ...EXECUTION_PUBLIC_COMMANDS,
]);
export const TARGET_PUBLIC_COMMANDS_BY_NAME = new Map(TARGET_PUBLIC_COMMANDS.map((command) => [command.name, command]));
const OPTIONAL_TARGETS = Object.freeze([
  ["qs-advanced", "QuickStark Advanced", "engineering", ADVANCED_COMMANDS],
  ["qs-frontend", "QuickStark Frontend", "engineering", FRONTEND_PUBLIC_COMMANDS],
  ["qs-video", "QuickStark Video", "video", VIDEO_PUBLIC_COMMANDS],
  ["qs-execution", "QuickStark Execution", "engineering", EXECUTION_PUBLIC_COMMANDS],
]);
export const TARGET_SKILL_COLLECTIONS = Object.freeze([
  ...LEGACY_SKILL_COLLECTIONS.filter((collection) => collection.id !== "ps-skills"),
  ...OPTIONAL_TARGETS.map(([id, displayName, bucket, publicCommands]) => defineCollection({
    id, displayName, packageName: id, codexPlugin: id,
    claudePackageRoot: `packages/${id}`, codexPackageRoot: `codex/plugins/${id}`,
    piPackageRoot: `pi/packages/${id}`, canonicalRoot: `skills/${bucket}`,
    documentationRoot: `docs/${bucket}`, publicCommands,
  })),
]);
export const TARGET_COLLECTION_REGISTRY = Object.freeze({
  schemaVersion: 1, collections: TARGET_SKILL_COLLECTIONS,
  publicCommands: TARGET_PUBLIC_COMMANDS, compositeWorkflows: COMPOSITE_WORKFLOWS,
});

// Changed only by the gated adoption transition. Candidate package projections
// select target metadata inside the projector; source/current installs stay legacy.
export const REGISTRY_STATE = "target";
export const PUBLIC_COMMANDS = REGISTRY_STATE === "target" ? TARGET_PUBLIC_COMMANDS : LEGACY_PUBLIC_COMMANDS;
export const SKILL_COLLECTIONS = REGISTRY_STATE === "target" ? TARGET_SKILL_COLLECTIONS : LEGACY_SKILL_COLLECTIONS;
export const PUBLIC_COMMANDS_BY_NAME = new Map(PUBLIC_COMMANDS.map((command) => [command.name, command]));
export const SKILL_COLLECTIONS_BY_ID = new Map(SKILL_COLLECTIONS.map((collection) => [collection.id, collection]));
export const COLLECTION_REGISTRY = Object.freeze({
  schemaVersion: 1, collections: SKILL_COLLECTIONS, publicCommands: PUBLIC_COMMANDS,
  compositeWorkflows: COMPOSITE_WORKFLOWS,
});

function requireArray(value, message) {
  if (!Array.isArray(value)) throw new Error(message);
}

export function validateSkillCollectionRegistryModel(model, { target = false } = {}) {
  if (!model || typeof model !== "object" || Array.isArray(model)) {
    throw new Error("The skill collection registry must be an object.");
  }
  if (model.schemaVersion !== 1) {
    throw new Error("The skill collection registry must identify schema version 1.");
  }
  requireArray(model.collections, "The skill collection registry must contain collections.");
  requireArray(model.publicCommands, "The skill collection registry must contain public commands.");
  requireArray(model.compositeWorkflows, "The skill collection registry must contain composite workflows.");

  const collectionIds = model.collections.map((collection) => collection.id);
  if (new Set(collectionIds).size !== collectionIds.length) {
    throw new Error("Registered collection identities must be unique.");
  }
  const expectedCollections = target ? TARGET_SKILL_COLLECTIONS : SKILL_COLLECTIONS;
  const expectedCommands = target ? TARGET_PUBLIC_COMMANDS : PUBLIC_COMMANDS;
  if (collectionIds.join("\0") !== expectedCollections.map((collection) => collection.id).join("\0")) {
    throw new Error("The registry must preserve the confirmed collection order.");
  }

  const commandNames = model.publicCommands.map((command) => command.name);
  const commandNameSet = new Set(commandNames);
  if (commandNameSet.size !== commandNames.length) {
    throw new Error("Registered public command names must be unique.");
  }
  if (commandNames.join("\0") !== expectedCommands.map((command) => command.name).join("\0")) {
    throw new Error("The registry must contain exactly the catalog-declared public commands in order.");
  }

  const workflowIds = model.compositeWorkflows.map((workflow) => workflow.id);
  if (new Set(workflowIds).size !== workflowIds.length) {
    throw new Error("Registered composite workflow identities must be unique.");
  }
  for (const workflow of model.compositeWorkflows) {
    requireArray(workflow.steps, `Composite workflow ${workflow.id} must define steps.`);
    requireArray(workflow.stopStatuses, `Composite workflow ${workflow.id} must define stop statuses.`);
    if (workflow.steps.length < 2 || workflow.steps.some((name) => !commandNameSet.has(name))) {
      throw new Error(`Composite workflow ${workflow.id} must contain at least two known public commands.`);
    }
    if (workflow.perRootReports !== true || workflow.automaticPublicSkillHops !== false) {
      throw new Error(`Composite workflow ${workflow.id} must preserve the one-root reporting boundary.`);
    }
  }

  const codexLiterals = model.publicCommands.map((command) => command.codexLiteral);
  if (new Set(codexLiterals).size !== codexLiterals.length) {
    throw new Error("Registered Codex literals must be unique.");
  }
  const claudeLiterals = model.publicCommands.map((command) => command.claudeLiteral);
  if (new Set(claudeLiterals).size !== claudeLiterals.length) {
    throw new Error("Registered Claude literals must be unique.");
  }

  const membership = new Map(commandNames.map((name) => [name, []]));
  for (const collection of model.collections) {
    requireArray(
      collection.publicCommands,
      `The registered collection ${collection.id} must list public commands.`,
    );
    for (const name of collection.publicCommands) {
      if (!membership.has(name)) {
        throw new Error(`The registered collection ${collection.id} references unknown command ${name}.`);
      }
      membership.get(name).push(collection.id);
    }
  }

  for (const command of model.publicCommands) {
    const owners = membership.get(command.name);
    if (owners.length !== 1 || owners[0] !== command.collectionId) {
      throw new Error(`The public command ${command.name} must belong to exactly one registered collection.`);
    }
    if (!collectionIds.includes(command.collectionId)) {
      throw new Error(`The public command ${command.name} references an unknown collection.`);
    }
    if (command.codexLiteral !== `$${command.codexPlugin}:${command.name}`
      || command.claudeLiteral !== `/${command.name}`) {
      throw new Error(`The public command ${command.name} has invalid package literals.`);
    }
    if (command.outputKind !== undefined
      && (command.outputKind !== "goal-workflow-prompt" || command.name !== "qs-deploy-prompt")) {
      throw new Error(`The public command ${command.name} has an invalid output kind.`);
    }
    if (command.name === "qs-deploy-prompt" && command.outputKind !== "goal-workflow-prompt") {
      throw new Error("The deployment prompt command must declare its goal-workflow output kind.");
    }
    if (command.name === "qs-help") {
      const routing = command.primaryRouting;
      if (routing?.kind !== PRIMARY_HELP_ROUTING.kind
        || routing.referenceFile !== PRIMARY_HELP_ROUTING.referenceFile
        || routing.availability !== PRIMARY_HELP_ROUTING.availability
        || routing.automaticInvocation !== false) {
        throw new Error("qs-help must preserve availability-checked primary routing without automatic invocation.");
      }
    } else if (command.primaryRouting !== undefined) {
      throw new Error(`The public command ${command.name} cannot declare primary Help routing.`);
    }
    if (typeof command.resultContext?.specProgress !== "boolean") {
      throw new Error(`The public command ${command.name} must define its spec-progress result contract.`);
    }
    for (const routeKind of ["normal", "failure"]) {
      requireArray(
        command.continuation?.[routeKind],
        `The public command ${command.name} must define ${routeKind} continuations.`,
      );
      for (const route of command.continuation[routeKind]) {
        if (!commandNameSet.has(route.name)) {
          throw new Error(`The public command ${command.name} has unknown continuation target ${route.name}.`);
        }
        if (route.name === command.name) {
          throw new Error(`The public command ${command.name} cannot continue to itself.`);
        }
      }
    }
    if (command.continuation.preferredCompositeWorkflow
      && !workflowIds.includes(command.continuation.preferredCompositeWorkflow)) {
      throw new Error(`The public command ${command.name} references an unknown composite workflow.`);
    }
  }

  return true;
}

validateSkillCollectionRegistryModel(COLLECTION_REGISTRY);
validateSkillCollectionRegistryModel(TARGET_COLLECTION_REGISTRY, { target: true });

export function resolvePublicCommand(name) {
  const command = PUBLIC_COMMANDS_BY_NAME.get(name);
  if (!command) throw new Error(`/${name} is an unknown public command.`);
  return command;
}

export function codexPublicSkillLiteral(name) {
  return resolvePublicCommand(name).codexLiteral;
}

export function claudePublicSkillLiteral(name) {
  return resolvePublicCommand(name).claudeLiteral;
}

export function piPublicSkillLiteral(name) {
  resolvePublicCommand(name);
  return `/skill:${name}`;
}

/**
 * Resolve a primary qs-help recommendation against observed host discovery.
 * Supply exact literals from the active host; installed package names or catalog
 * membership are insufficient evidence. This function neither invokes nor installs.
 */
export function resolvePrimaryHelpRoute(name, { harness = "codex", availableLiterals = [] } = {}) {
  const command = resolvePublicCommand(name);
  const literalByHarness = {
    codex: codexPublicSkillLiteral,
    claude: claudePublicSkillLiteral,
    pi: piPublicSkillLiteral,
  };
  if (!Object.hasOwn(literalByHarness, harness)) {
    throw new Error(`Unsupported primary Help routing harness: ${harness}.`);
  }
  if (!Array.isArray(availableLiterals)
    || availableLiterals.some((literal) => typeof literal !== "string" || literal.trim() !== literal || !literal)) {
    throw new Error("Primary Help routing requires an array of exact observed host literals.");
  }
  const literal = literalByHarness[harness](name);
  const metadata = {
    name: command.name,
    collectionId: command.collectionId,
    description: command.shortDescription,
    harness,
  };
  if (!availableLiterals.includes(literal)) {
    return Object.freeze({
      ...metadata,
      status: "input-required",
      prerequisite: `Make ${command.collectionId} available in the active ${harness} host and verify discovery of ${name}. Installation or enabling requires user authority.`,
    });
  }
  return Object.freeze({ ...metadata, status: "ready", literal });
}
