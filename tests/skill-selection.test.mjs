import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, symlink, link, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { normalizeSelectionRecord, resolveTargetSelection, selectionRecordPath, readSelectionRecord, saveSelectionRecord } from "../scripts/skill-selection.mjs";

const profiles = { schemaVersion: 1, defaultProfile: "core", profiles: {
  core: { packages: ["qs-skills"], resources: [] },
  writing: { packages: ["qs-skills", "qs-specialists"], resources: [] },
} };
const base = { agent: "codex", profiles, packageNames: ["qs-skills", "qs-specialists", "ps-skills"], resourceNames: ["hyperframes", "unlazy"] };
const selected = (packages, resources = []) => ({ packages, resources, profile: null, additions: [] });
const record = (targets) => ({ schemaVersion: 1, targets, templateRevision: "a".repeat(40), lastSuccessfulTransaction: "test-transaction" });
async function fixture(t) {
  const home = await mkdtemp(join(tmpdir(), "qs-selection-test-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  return { home, path: selectionRecordPath(home) };
}

test("fresh selection is core-only even when the registry grows", () => {
  const output = resolveTargetSelection({ ...base, packageNames: [...base.packageNames, "qs-video"] });
  assert.deepEqual(output.selection, { packages: ["qs-skills"], resources: [], profile: "core", additions: [] });
  assert.equal(output.basis, "fresh-default");
});

test("saved exact selection and resources survive new packages and changed named profiles", () => {
  const savedRecord = record({ codex: selected(["qs-skills", "qs-specialists"], ["unlazy"]) });
  const output = resolveTargetSelection({ ...base, savedRecord, packageNames: [...base.packageNames, "qs-video"] });
  assert.deepEqual(output.selection, savedRecord.targets.codex);
  assert.equal(output.basis, "saved");
});

test("verified legacy selection remains per-harness and does not become all packages", () => {
  const savedRecord = record({ pi: selected(["qs-specialists"]) });
  const output = resolveTargetSelection({ ...base, savedRecord, legacy: { packages: ["ps-skills"], resources: ["hyperframes"], conflicts: [] } });
  assert.deepEqual(output.selection, selected(["ps-skills"], ["hyperframes"]));
  assert.deepEqual(savedRecord.targets.pi, selected(["qs-specialists"]));
  assert.equal(output.basis, "verified-legacy");
});

test("explicit profile starts a desired selection; additions extend it and removals stay a plan", () => {
  const output = resolveTargetSelection({ ...base, profile: "core", withPackages: ["qs-specialists"],
    legacy: { packages: ["qs-skills", "ps-skills"], resources: ["unlazy"], conflicts: [] } });
  assert.deepEqual(output.selection.packages, ["qs-skills", "qs-specialists"]);
  assert.deepEqual(output.retirements, { packages: ["ps-skills"], resources: ["unlazy"] });
  assert.deepEqual(output.selection.additions, ["qs-specialists"]);
});

test("an addition without a profile preserves saved selections rather than resetting them", () => {
  const output = resolveTargetSelection({ ...base, savedRecord: record({ codex: selected(["ps-skills"], ["unlazy"]) }), withPackages: ["qs-specialists"] });
  assert.deepEqual(output.selection.packages, ["ps-skills", "qs-specialists"]);
  assert.deepEqual(output.selection.resources, ["unlazy"]);
});

test("ambiguous old installation cannot silently fall back to fresh default, even with explicit profile", () => {
  for (const profile of [null, "core"]) assert.throws(() => resolveTargetSelection({ ...base, profile,
    legacy: { packages: [], resources: [], conflicts: ["changed source ownership"] } }), /ambiguous/);
});

test("retired or unknown saved identities require migration instead of being dropped", () => {
  assert.throws(() => resolveTargetSelection({ ...base, savedRecord: record({ codex: selected(["qs-old"]) }) }), /verified migration/);
  assert.throws(() => resolveTargetSelection({ ...base, legacy: { packages: [], resources: ["unknown"], conflicts: [] } }), /verified migration/);
});

test("invalid inputs fail before choosing a profile", () => {
  for (const override of [
    { agent: "unknown" }, { profile: "missing" }, { profile: "constructor" },
    { withPackages: ["qs-unknown"] }, { withPackages: ["qs-skills", "qs-skills"] },
    { profiles: { ...profiles, defaultProfile: "writing" } },
    { savedRecord: { ...record({}), schemaVersion: 2 } },
    { savedRecord: record({ codex: selected(["qs-skills", "qs-skills"]) }) },
    { savedRecord: { ...record({}), futureData: { preserveMe: true } } },
    { savedRecord: record({ codex: { ...selected(["qs-skills"]), futureTargetData: true } }) },
    { savedRecord: record({ codex: { ...selected(["qs-skills"]), profile: "../../invalid" } }) },
    { savedRecord: { ...record({}), templateRevision: "embedded\nline" } },
  ]) assert.throws(() => resolveTargetSelection({ ...base, ...override }));
});

test("reading absent selection leaves the filesystem unchanged", async (t) => {
  const { home, path } = await fixture(t);
  assert.deepEqual(await readSelectionRecord(path), { record: null, fingerprint: null });
  assert.deepEqual(await readdir(home), []);
});

test("selection saves atomically with expected fingerprint and retains other harness state", async (t) => {
  const { path } = await fixture(t);
  const first = record({ codex: selected(["qs-skills"]), pi: selected(["ps-skills"], ["unlazy"]) });
  const saved = await saveSelectionRecord(path, first, { expectedFingerprint: null });
  assert.deepEqual(saved.record, first);
  assert.match(saved.fingerprint, /^[a-f0-9]{64}$/);
  const next = { ...first, targets: { ...first.targets, codex: selected(["qs-skills", "qs-specialists"]) } };
  await saveSelectionRecord(path, next, { expectedFingerprint: saved.fingerprint });
  assert.deepEqual((await readSelectionRecord(path)).record.targets.pi, first.targets.pi);
  assert.deepEqual(await readdir(join(path, "..")), ["skills-selection.json"]);
});

test("stale or missing save fingerprint cannot overwrite a selection", async (t) => {
  const { path } = await fixture(t);
  const existing = record({ codex: selected(["ps-skills"]) });
  await saveSelectionRecord(path, existing, { expectedFingerprint: null });
  const bytes = await readFile(path);
  await assert.rejects(saveSelectionRecord(path, record({}), { expectedFingerprint: null }), /changed after planning/);
  await assert.rejects(saveSelectionRecord(path, record({})), /observed fingerprint/);
  assert.deepEqual(await readFile(path), bytes);
});

test("unsafe or malformed selection files remain untouched", async (t) => {
  const { home, path } = await fixture(t);
  await mkdir(join(home, ".config", "quickstark"), { recursive: true });
  await writeFile(path, "not json");
  await assert.rejects(readSelectionRecord(path));
  await writeFile(path, " ".repeat(1024 * 1024 + 1));
  await assert.rejects(readSelectionRecord(path), /bounded/);
  await rm(path);
  const source = join(home, "original.json");
  await writeFile(source, JSON.stringify(record({})));
  await symlink(source, path);
  await assert.rejects(readSelectionRecord(path), /unlinked/);
  await rm(path);
  await link(source, path);
  await assert.rejects(readSelectionRecord(path), /unlinked/);
  assert.equal(await readFile(source, "utf8"), JSON.stringify(record({})));
});

test("symlinked parent and an existing transaction lock are not bypassed", async (t) => {
  const { home, path } = await fixture(t);
  await mkdir(join(home, "external"));
  await symlink(join(home, "external"), join(home, ".config"));
  await assert.rejects(saveSelectionRecord(path, record({}), { expectedFingerprint: null }), /real directory/);
  await rm(join(home, ".config"));
  await mkdir(join(home, ".config", "quickstark"), { recursive: true });
  await mkdir(`${path}.lock`);
  await assert.rejects(saveSelectionRecord(path, record({}), { expectedFingerprint: null }), /EEXIST/);
  assert.deepEqual(await readdir(join(path, "..")), ["skills-selection.json.lock"]);
});

test("malformed record cannot conceal invalid target selections", () => {
  assert.throws(() => normalizeSelectionRecord(record({ unknown: selected([]) })), /Unsupported selection target/);
  assert.throws(() => normalizeSelectionRecord(record({ codex: { ...selected([]), additions: ["qs-skills"] } })), /must be selected/);
});
