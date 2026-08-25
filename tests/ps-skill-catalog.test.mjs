import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PS_CATALOG,
  PS_COLLECTION,
  PS_DISPOSITIONS,
  PS_INTERNAL_CAPABILITIES,
  PS_PUBLIC_COMMANDS,
  PS_UPSTREAM,
  psCodexSkillLiteral,
  validatePsCatalogModel,
} from "../scripts/ps-skill-catalog.mjs";
import {
  V3_CORE_SKILLS,
  V3_SPECIALIST_SKILLS,
} from "../scripts/qs-skill-catalog.mjs";

const inventoryUrl = new URL("./fixtures/pstack-0.14.1-inventory.json", import.meta.url);

const publicNames = [
  "ps-help",
  "ps-how",
  "ps-why",
  "ps-blast-radius",
  "ps-runtime-forensics",
  "ps-trace-forensics",
  "ps-create-verification-skill",
  "ps-maintain-verification-skill",
  "ps-skill-eval",
  "ps-hillclimb",
  "ps-visual-parity",
  "ps-pr-babysit",
  "ps-worktree-cleanup",
];

const capabilityNames = [
  "multi-candidate-exploration",
  "decision-trail",
  "parallel-coverage",
  "typescript-discipline",
  "plain-writing",
  "boundary-discipline",
  "rerunnable-tooling",
  "structural-enforcement",
  "experience-first",
  "context-discipline",
  "minimal-change",
  "idempotent-operations",
  "outcome-oriented-execution",
  "concurrency-ownership",
  "type-system-discipline",
  "bounded-autonomous-loop",
];

const continuationNames = {
  "ps-help": ["ps-how", "ps-why", "qs-plan-clarify"],
  "ps-how": ["ps-blast-radius", "qs-plan-spec", "ps-why"],
  "ps-why": ["qs-plan-clarify", "ps-how", "ps-blast-radius"],
  "ps-blast-radius": ["qs-plan-spec", "qs-review-code", "qs-flow-handoff"],
  "ps-runtime-forensics": ["qs-code-debug", "ps-trace-forensics", "qs-flow-handoff"],
  "ps-trace-forensics": ["qs-code-debug", "ps-runtime-forensics", "qs-flow-handoff"],
  "ps-create-verification-skill": ["ps-maintain-verification-skill", "qs-review-code", "qs-git-merge"],
  "ps-maintain-verification-skill": ["qs-review-code", "ps-create-verification-skill", "qs-flow-handoff"],
  "ps-skill-eval": ["qs-skill-write", "qs-plan-clarify", "qs-flow-handoff"],
  "ps-hillclimb": ["qs-review-code", "qs-test-verify", "qs-flow-handoff"],
  "ps-visual-parity": ["qs-review-code", "qs-test-verify", "qs-flow-handoff"],
  "ps-pr-babysit": ["qs-git-merge", "qs-code-debug", "qs-flow-handoff"],
  "ps-worktree-cleanup": ["qs-flow-handoff", "qs-setup", "ps-help"],
};

test("PS-01 defines one pinned optional PS collection and thirteen explicit commands", () => {
  assert.equal(validatePsCatalogModel(PS_CATALOG), true);
  assert.deepEqual(PS_COLLECTION, {
    id: "ps",
    name: "Pstack Skills",
    packageName: "ps-skills",
    codexPlugin: "ps-skills",
    claudePackageRoot: "packages/ps-skills",
    codexPackageRoot: "codex/plugins/ps-skills",
    canonicalRoot: "skills/pstack/commands",
    documentationRoot: "docs/pstack",
  });
  assert.deepEqual(PS_PUBLIC_COMMANDS.map((command) => command.name), publicNames);
  assert.deepEqual(
    PS_PUBLIC_COMMANDS.map((command) => command.lifecycle.position),
    Array.from({ length: 13 }, (_, index) => (index + 1) * 10),
  );
  assert.ok(PS_PUBLIC_COMMANDS.every((command) => command.invocationPolicy === "explicit"));
  assert.ok(PS_PUBLIC_COMMANDS.every((command) => command.disableModelInvocation === true));
  assert.ok(PS_PUBLIC_COMMANDS.every((command) => command.allowImplicitInvocation === false));
  assert.equal(PS_PUBLIC_COMMANDS[0].provenance.kind, "repository-authored");
  assert.equal(PS_PUBLIC_COMMANDS[0].provenance.candidateId, null);
  assert.ok(PS_PUBLIC_COMMANDS.slice(1).every(
    (command) => command.provenance.kind === "upstream-adaptation",
  ));
  assert.equal(psCodexSkillLiteral("ps-how"), "$ps-skills:ps-how");
  assert.throws(() => psCodexSkillLiteral("qs-help"), /not a PS public command/i);
});

test("PS-01 records display, chat-presentation, and continuation metadata for every command", () => {
  for (const command of PS_PUBLIC_COMMANDS) {
    assert.match(command.displayName, /^PS /);
    assert.ok(command.shortDescription.length > 10 && command.shortDescription.length <= 100);
    assert.ok(command.prompt.length > 10);
    assert.deepEqual(command.effort, { supported: ["quick", "standard", "deep"], default: "standard" });
    assert.deepEqual(command.report, { supported: ["brief", "full"], default: "brief" });
    assert.equal(command.readoutProfile, undefined);
    assert.deepEqual(
      command.continuation.normal.map((item) => item.name),
      continuationNames[command.name],
    );
    assert.equal(command.continuation.failure.length, 3);
    assert.equal(command.continuation.maximumPrompts, 1);
    assert.equal(command.continuation.defaultPrompts, 0);
    assert.equal(command.continuation.automaticPublicSkillHops, false);
  }
});

test("PS-01 pins the upstream provenance and complete offline 72-candidate inventory", async () => {
  const inventory = JSON.parse(await readFile(inventoryUrl, "utf8"));

  assert.deepEqual(PS_UPSTREAM, {
    repository: "https://github.com/cursor/plugins",
    subdirectory: "pstack",
    version: "0.14.1",
    commit: "63d938c2e4a165a0fec1bd0f61a8e325f0cb751e",
    author: "Lauren Tan",
    license: "MIT",
    copyright: "Copyright (c) 2026 Lauren Tan",
  });
  assert.equal(inventory.schemaVersion, 1);
  assert.deepEqual(inventory.upstream, PS_UPSTREAM);
  assert.equal(inventory.candidates.length, 72);
  assert.equal(new Set(inventory.candidates.map((candidate) => candidate.id)).size, 72);
  assert.deepEqual(
    Object.fromEntries(["skill", "principle", "playbook", "agent", "benny-skill"].map(
      (kind) => [kind, inventory.candidates.filter((candidate) => candidate.kind === kind).length],
    )),
    { skill: 23, principle: 21, playbook: 23, agent: 2, "benny-skill": 3 },
  );
  assert.ok(inventory.candidates.every(
    (candidate) => candidate.id === `${candidate.kind}:${candidate.name}`
      && typeof candidate.source === "string"
      && candidate.source.length > 0,
  ));
  assert.deepEqual(
    PS_DISPOSITIONS.map((item) => item.candidateId).sort(),
    inventory.candidates.map((item) => item.id).sort(),
  );
});

test("PS-01 classifies every candidate once with the confirmed 12/16/30/4/10 totals", () => {
  assert.equal(PS_DISPOSITIONS.length, 72);
  assert.equal(new Set(PS_DISPOSITIONS.map((item) => item.candidateId)).size, 72);
  assert.deepEqual(
    Object.fromEntries([
      "public", "internal", "merge", "dependency", "omit",
    ].map((kind) => [kind, PS_DISPOSITIONS.filter((item) => item.kind === kind).length])),
    { public: 12, internal: 16, merge: 30, dependency: 4, omit: 10 },
  );
  assert.deepEqual(
    PS_DISPOSITIONS.filter((item) => item.kind === "public").map((item) => item.target).sort(),
    publicNames.slice(1).sort(),
  );
  assert.deepEqual(PS_INTERNAL_CAPABILITIES.map((capability) => capability.name), capabilityNames);
  assert.ok(PS_INTERNAL_CAPABILITIES.every(
    (capability) => capability.owners.length > 0
      && capability.owners.every((owner) => publicNames.includes(owner)),
  ));
});

test("PS-01 validation rejects catalog drift without changing QS membership", () => {
  assert.equal(V3_CORE_SKILLS.length, 12);
  assert.equal(V3_SPECIALIST_SKILLS.length, 7);

  const invalidModels = [
    ["missing command", (model) => model.publicCommands.pop(), /thirteen ordered public commands/i],
    ["implicit command", (model) => { model.publicCommands[1].invocationPolicy = "model"; }, /explicit-only/i],
    ["duplicate lifecycle", (model) => { model.publicCommands[1].lifecycle.position = 10; }, /lifecycle/i],
    ["missing disposition", (model) => model.dispositions.pop(), /72 dispositions/i],
    ["wrong disposition total", (model) => { model.dispositions[0].kind = "omit"; }, /disposition totals/i],
    ["unknown owner", (model) => { model.internalCapabilities[0].owners[0] = "ps-missing"; }, /public owners/i],
    ["automatic chaining", (model) => { model.publicCommands[0].continuation.automaticPublicSkillHops = true; }, /automatic public skill hops/i],
  ];

  for (const [label, mutate, expected] of invalidModels) {
    const model = structuredClone(PS_CATALOG);
    mutate(model);
    assert.throws(() => validatePsCatalogModel(model), expected, label);
  }
});
