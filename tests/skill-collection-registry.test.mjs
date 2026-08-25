import assert from "node:assert/strict";
import test from "node:test";

import {
  COMPOSITE_WORKFLOWS,
  COLLECTION_REGISTRY,
  PUBLIC_COMMANDS,
  codexPublicSkillLiteral,
  renderCompositeWorkflowPrompt,
  resolvePublicCommand,
  validateSkillCollectionRegistryModel,
} from "../scripts/skill-collection-registry.mjs";

test("PS-02 resolves QS core, QS specialist, and PS commands through registered collections", () => {
  assert.equal(validateSkillCollectionRegistryModel(COLLECTION_REGISTRY), true);
  assert.equal(PUBLIC_COMMANDS.length, 32);

  assert.deepEqual(
    COLLECTION_REGISTRY.collections.map((collection) => [collection.id, collection.publicCommands.length]),
    [["qs-skills", 12], ["qs-specialists", 7], ["ps-skills", 13]],
  );

  assert.deepEqual(
    ["qs-help", "qs-plan-research", "ps-how"].map((name) => {
      const command = resolvePublicCommand(name);
      return [command.name, command.collectionId, command.codexLiteral, command.claudeLiteral];
    }),
    [
      ["qs-help", "qs-skills", "$qs-skills:qs-help", "/qs-help"],
      ["qs-plan-research", "qs-specialists", "$qs-specialists:qs-plan-research", "/qs-plan-research"],
      ["ps-how", "ps-skills", "$ps-skills:ps-how", "/ps-how"],
    ],
  );
  assert.equal(codexPublicSkillLiteral("ps-how"), "$ps-skills:ps-how");
  assert.equal(resolvePublicCommand("ps-how").invocationPolicy, "explicit");
  assert.equal(resolvePublicCommand("ps-how").readoutProfile, undefined);
});

test("composite continuation renders an explicit build review test merge workflow prompt", () => {
  const workflow = COMPOSITE_WORKFLOWS.find(({ id }) => id === "build-review-test-merge");
  assert.deepEqual(workflow.steps, ["qs-code-build", "qs-review-code", "qs-test-verify", "qs-git-merge"]);
  assert.deepEqual(workflow.stopStatuses, ["continuation-required", "input-required", "failed"]);
  assert.equal(workflow.automaticPublicSkillHops, false);

  const prompt = renderCompositeWorkflowPrompt(workflow.id, {
    harness: "codex",
    context: "Implement ticket QS-42.",
  });
  for (const literal of [
    "$qs-skills:qs-code-build",
    "$qs-skills:qs-review-code",
    "$qs-specialists:qs-test-verify",
    "$qs-skills:qs-git-merge",
  ]) assert.match(prompt, new RegExp(literal.replace("$", "\\$&")));
  assert.match(prompt, /separate public root/i);
  assert.match(prompt, /stop.*continuation-required.*input-required.*failed/is);
  assert.match(prompt, /does not grant.*commit.*merge.*push/is);
});

test("composite workflow helpers remain structural but are not assigned to completion prompts", () => {
  for (const workflow of COMPOSITE_WORKFLOWS) {
    assert.equal(workflow.perRootReports, true);
    assert.equal(workflow.automaticPublicSkillHops, false);
    assert.ok(workflow.steps.length >= 2);
  }
  assert.match(
    renderCompositeWorkflowPrompt("review-test-merge", { harness: "claude" }),
    /^\/qs-review-code/,
  );
  for (const command of PUBLIC_COMMANDS) {
    assert.equal(command.continuation.preferredCompositeWorkflow, undefined, command.name);
  }
});

test("Pi composite workflow uses exact skill literals and preserves stop boundaries", () => {
  const prompt = renderCompositeWorkflowPrompt("build-review-test-merge", {
    harness: "pi",
    context: "Implement QS-42.",
  });
  assert.match(prompt, /^\/skill:qs-code-build/);
  assert.match(prompt, /\/skill:qs-review-code/);
  assert.match(prompt, /\/skill:qs-test-verify/);
  assert.match(prompt, /\/skill:qs-git-merge/);
  assert.match(prompt, /separate public root/i);
  assert.match(prompt, /stop on continuation-required, input-required, failed/i);
});

test("PS-02 rejects unknown commands, duplicate identities, and missing continuation targets", () => {
  assert.throws(() => resolvePublicCommand("ps-missing"), /unknown public command/i);
  assert.throws(() => codexPublicSkillLiteral("ps-missing"), /unknown public command/i);

  const invalidModels = [
    ["duplicate name", (model) => { model.publicCommands[1].name = model.publicCommands[0].name; }, /command names must be unique/i],
    ["duplicate literal", (model) => { model.publicCommands[1].codexLiteral = model.publicCommands[0].codexLiteral; }, /Codex literals must be unique/i],
    ["missing target", (model) => { model.publicCommands.find((item) => item.name === "ps-how").continuation.normal[0].name = "ps-missing"; }, /unknown continuation target/i],
    ["ambiguous membership", (model) => { model.collections[1].publicCommands.push("qs-help"); }, /exactly one registered collection/i],
    ["unknown collection command", (model) => { model.collections[0].publicCommands[0] = "qs-missing"; }, /unknown command/i],
  ];

  for (const [label, mutate, expected] of invalidModels) {
    const model = structuredClone(COLLECTION_REGISTRY);
    mutate(model);
    assert.throws(() => validateSkillCollectionRegistryModel(model), expected, label);
  }
});

test("PS-02 retains package-local continuation metadata and exact literals", () => {
  for (const command of PUBLIC_COMMANDS) {
    assert.equal(command.codexLiteral, `$${command.codexPlugin}:${command.name}`);
    assert.equal(command.claudeLiteral, `/${command.name}`);
    assert.equal(command.readoutProfile, undefined);
    assert.ok(Array.isArray(command.continuation.normal));
    assert.ok(Array.isArray(command.continuation.failure));
    assert.ok(command.continuation.normal.every((route) => PUBLIC_COMMANDS.some(
      (candidate) => candidate.name === route.name,
    )));
    assert.ok(command.continuation.failure.every((route) => PUBLIC_COMMANDS.some(
      (candidate) => candidate.name === route.name,
    )));
  }
});
