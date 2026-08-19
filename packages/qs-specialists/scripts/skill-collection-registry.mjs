import {
  NEXT_SKILLS_BY_NAME,
  READOUT_PROFILES_BY_NAME,
  V3_CORE_SKILLS,
  V3_SPECIALIST_SKILLS,
} from "./qs-skill-catalog.mjs";
import {
  PS_COLLECTION,
  PS_PUBLIC_COMMANDS,
} from "./ps-skill-catalog.mjs";

function freezeRoutes(routes) {
  return Object.freeze(routes.map((route) => Object.freeze({ ...route })));
}

function defineQsCommand(command) {
  const routes = NEXT_SKILLS_BY_NAME[command.name];
  const collectionId = command.distribution === "core" ? "qs-skills" : "qs-specialists";
  return Object.freeze({
    ...command,
    collectionId,
    packageName: collectionId,
    codexPlugin: collectionId,
    codexLiteral: `$${collectionId}:${command.name}`,
    claudeLiteral: `/${command.name}`,
    readoutProfile: READOUT_PROFILES_BY_NAME[command.name],
    continuation: Object.freeze({
      ...command.continuation,
      normal: freezeRoutes(routes.filter((route) => route.availability !== "failure")),
      failure: freezeRoutes(routes
        .filter((route) => route.availability !== "success")
        .sort((left, right) => Number(right.recovery) - Number(left.recovery))),
    }),
  });
}

function definePsCommand(command) {
  return Object.freeze({
    ...command,
    collectionId: PS_COLLECTION.packageName,
    codexLiteral: `$${PS_COLLECTION.codexPlugin}:${command.name}`,
    claudeLiteral: `/${command.name}`,
  });
}

const QS_CORE_COMMANDS = Object.freeze(V3_CORE_SKILLS.map(defineQsCommand));
const QS_SPECIALIST_COMMANDS = Object.freeze(V3_SPECIALIST_SKILLS.map(defineQsCommand));
const PS_COMMANDS = Object.freeze(PS_PUBLIC_COMMANDS.map(definePsCommand));

export const PUBLIC_COMMANDS = Object.freeze([
  ...QS_CORE_COMMANDS,
  ...QS_SPECIALIST_COMMANDS,
  ...PS_COMMANDS,
]);

export const PUBLIC_COMMANDS_BY_NAME = new Map(
  PUBLIC_COMMANDS.map((command) => [command.name, command]),
);

function defineCollection({
  id,
  displayName,
  packageName,
  codexPlugin,
  claudePackageRoot,
  codexPackageRoot,
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
    canonicalRoot,
    documentationRoot,
    publicCommands: Object.freeze(publicCommands.map((command) => command.name)),
  });
}

export const SKILL_COLLECTIONS = Object.freeze([
  defineCollection({
    id: "qs-skills",
    displayName: "QuickStark Skills",
    packageName: "qs-skills",
    codexPlugin: "qs-skills",
    claudePackageRoot: ".",
    codexPackageRoot: "codex/plugins/qs-skills",
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
    canonicalRoot: PS_COLLECTION.canonicalRoot,
    documentationRoot: PS_COLLECTION.documentationRoot,
    publicCommands: PS_COMMANDS,
  }),
]);

export const SKILL_COLLECTIONS_BY_ID = new Map(
  SKILL_COLLECTIONS.map((collection) => [collection.id, collection]),
);

export const COLLECTION_REGISTRY = Object.freeze({
  schemaVersion: 1,
  collections: SKILL_COLLECTIONS,
  publicCommands: PUBLIC_COMMANDS,
});

function requireArray(value, message) {
  if (!Array.isArray(value)) throw new Error(message);
}

export function validateSkillCollectionRegistryModel(model) {
  if (!model || typeof model !== "object" || Array.isArray(model)) {
    throw new Error("The skill collection registry must be an object.");
  }
  if (model.schemaVersion !== 1) {
    throw new Error("The skill collection registry must identify schema version 1.");
  }
  requireArray(model.collections, "The skill collection registry must contain collections.");
  requireArray(model.publicCommands, "The skill collection registry must contain public commands.");

  const collectionIds = model.collections.map((collection) => collection.id);
  if (new Set(collectionIds).size !== collectionIds.length) {
    throw new Error("Registered collection identities must be unique.");
  }
  if (collectionIds.join("\0") !== ["qs-skills", "qs-specialists", "ps-skills"].join("\0")) {
    throw new Error("The registry must preserve the confirmed collection order.");
  }

  const commandNames = model.publicCommands.map((command) => command.name);
  const commandNameSet = new Set(commandNames);
  if (commandNameSet.size !== commandNames.length) {
    throw new Error("Registered public command names must be unique.");
  }
  if (model.publicCommands.length !== 32) {
    throw new Error("The registry must contain exactly 32 public commands.");
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
    if (!command.readoutProfile?.title) {
      throw new Error(`The public command ${command.name} has no readout profile.`);
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
  }

  return true;
}

validateSkillCollectionRegistryModel(COLLECTION_REGISTRY);

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
