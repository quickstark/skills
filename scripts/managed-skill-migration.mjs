import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeSelectionRecord, readSelectionRecord, resolveTargetSelection, selectionRecordPath } from './skill-selection.mjs';
import { planSkillMigrations, readSkillMigrations } from './skill-migrations.mjs';
import { captureMigrationPath, revalidateMigrationPath } from './migration-filesystem.mjs';
import { createOwnedPathAdapter, ownedFileState, ownedPathState } from './migration-owned-paths.mjs';
import { createNativePackageAdapter, observeNativePackages, predictNativePackageTransition } from './migration-native-packages.mjs';
import { readMigrationJournal, runMigrationTransaction, validateMigrationTransactionPlan } from './migration-transaction.mjs';
import { lockEntryMatches } from './personal-skills/lock.mjs';

const runFile = promisify(execFile);
const check = (value, message) => { if (!value) throw new Error(message); };
const canonical = (value) => JSON.stringify(value, function (key, entry) { return entry && typeof entry === 'object' && !Array.isArray(entry) ? Object.fromEntries(Object.keys(entry).sort().map((name) => [name, entry[name]])) : entry; });
const sha = (value) => createHash('sha256').update(value).digest('hex');
const hash = (value) => sha(canonical(value));
const same = (first, second) => hash(first) === hash(second);
const names = (value) => Array.isArray(value) && value.every((name) => typeof name === 'string' && /^[a-z0-9][a-z0-9.:-]*$/.test(name)) && new Set(value).size === value.length;
const absolute = (value) => typeof value === 'string' && path.isAbsolute(value) && path.normalize(value) === value && value !== '/' && !/[\0-\x1f]/.test(value);
const sorted = (values) => [...new Set(values)].sort();
const inside = (value, root) => value.startsWith(root + path.sep);
const key = (value) => `${value.agent}:${value.kind}:${value.identity}`;
const freeze = (value) => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const clone = (value) => JSON.parse(canonical(value));
const CHECKS = ['package-closure', 'notices', 'behavior', 'native-discovery'];

async function fileEvidence(reference, maximumBytes = 128 * 1024 * 1024) {
  check(reference && absolute(reference.path) && /^[a-f0-9]{64}$/.test(reference.sha256), 'Evidence requires an exact file and SHA-256.');
  const snapshot = await captureMigrationPath(reference.path);
  check(snapshot.kind === 'file' && snapshot.bytes <= maximumBytes, 'Evidence must be a bounded regular file.');
  const bytes = await readFile(reference.path); await revalidateMigrationPath(snapshot);
  check(sha(bytes) === reference.sha256, 'Evidence file changed after its reference was recorded.');
  return { bytes, snapshot };
}

async function jsonEvidence(reference) {
  const { bytes, snapshot } = await fileEvidence(reference, 1024 * 1024);
  let value; try { value = JSON.parse(bytes); } catch { throw new Error('Evidence JSON is invalid; contents withheld.'); }
  return { value, snapshot };
}

/** Portable historical content identity plus complete mode/hidden-file snapshot.
 * Neither measurement is proof of ownership or adopted upstream provenance. */
export async function captureManagedSkillPayload(source) {
  const snapshot = await captureMigrationPath(source); check(snapshot.kind === 'directory', 'Managed payload must be a real directory.');
  const digest = createHash('sha256');
  for (const entry of snapshot.entries.filter((entry) => entry.kind === 'file' && !entry.path.split('/').some((part) => ['.git', 'node_modules'].includes(part))).sort((a, b) => a.path.localeCompare(b.path))) {
    digest.update(entry.path); digest.update(await readFile(path.join(source, entry.path)));
  }
  await revalidateMigrationPath(snapshot);
  return { snapshot, payloadDigest: { kind: 'portable-directory-sha256', value: digest.digest('hex') } };
}

async function verifySourceRevision({ cwd, source, revision }) {
  check(absolute(cwd) && absolute(source) && source.startsWith(cwd + path.sep), 'Published source must be inside the bound release checkout.');
  const relative = path.relative(cwd, source);
  const options = { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: 10000, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } };
  const head = await runFile('git', ['rev-parse', 'HEAD'], options);
  check(head.stdout.trim() === revision, 'Release checkout revision changed.');
  const tracked = await runFile('git', ['ls-files', '--', relative], options);
  const dirty = await runFile('git', ['status', '--porcelain', '--untracked-files=all', '--', relative], options);
  check(tracked.stdout.trim() && !dirty.stdout.trim(), 'Release payload has uncommitted/untracked changes; it is not the claimed published revision.');
}

async function checkedPackage(pkg, agent, input, snapshots) {
  const artifact = pkg.artifacts?.[agent]; check(artifact && absolute(artifact.source), 'Selected package artifact is unavailable.');
  check(pkg.registered === true && pkg.revision === input.revision && typeof pkg.version === 'string' && names(pkg.publicSkills) && names(pkg.capabilityIds), 'Package registration/revision metadata is incomplete.');
  check(pkg.selectionCapabilityIds === undefined || names(pkg.selectionCapabilityIds) && pkg.selectionCapabilityIds.length > 0 && pkg.selectionCapabilityIds.every((capability) => pkg.capabilityIds.includes(capability)), 'Selection capabilities must be a nonempty unique subset of full acceptance capabilities.');
  const payload = await captureManagedSkillPayload(artifact.source);
  check(same(payload.payloadDigest, artifact.payloadDigest) && payload.snapshot.contentSha256 === artifact.contentSha256, 'Published package content differs from its accepted artifact.');
  await (input.runtime?.verifySourceRevision ?? verifySourceRevision)({ cwd: input.cwd, source: artifact.source, revision: input.revision });
  let receipt; const proofSnapshots = [];
  if (input.runtime?.verifyAcceptance) {
    const verified = await input.runtime.verifyAcceptance({ pkg, artifact, agent, revision: input.revision, payload });
    receipt = verified?.receipt;
    check(Array.isArray(verified?.evidenceSnapshots) && verified.evidenceSnapshots.some((snapshot) => snapshot.kind === 'file'), 'Derived acceptance needs original evidence-file snapshots.');
    for (const snapshot of verified.evidenceSnapshots) { check(['file', 'directory'].includes(snapshot.kind), 'Acceptance evidence must bind regular files or source directory trees.'); await revalidateMigrationPath(snapshot); proofSnapshots.push(snapshot); }
  } else { const proof = await jsonEvidence(artifact.acceptance); receipt = proof.value; proofSnapshots.push(proof.snapshot); }
  check(receipt && typeof receipt === 'object', 'Acceptance verifier returned no receipt.');
  check(receipt.schemaVersion === 1 && receipt.agent === agent && receipt.packageId === pkg.id && receipt.version === pkg.version && receipt.revision === input.revision && same(receipt.payloadDigest, payload.payloadDigest) && receipt.contentSha256 === payload.snapshot.contentSha256, 'Acceptance receipt does not bind this actual release payload.');
  check(names(receipt.verifiedCapabilities) && pkg.capabilityIds.every((capability) => receipt.verifiedCapabilities.includes(capability)), 'Acceptance receipt omits package capability evidence.');
  for (const name of sorted([...CHECKS, ...(pkg.requiredChecks ?? [])])) check(receipt.checks?.[name] === 'passed', `Required replacement acceptance is unresolved: ${name}.`);
  check(input.runtime?.verifyAcceptance || Array.isArray(receipt.references) && receipt.references.length > 0, 'Acceptance requires independent supporting evidence files.');
  const references = [];
  for (const reference of receipt.references ?? []) { const evidence = await fileEvidence(reference); references.push(evidence.snapshot); }
  snapshots.push(payload.snapshot, ...proofSnapshots, ...references);
  return { id: pkg.id, registered: true, version: pkg.version, revision: pkg.revision, publicSkills: pkg.publicSkills, capabilityIds: pkg.selectionCapabilityIds ?? pkg.capabilityIds, fullCapabilityIds: pkg.capabilityIds, payloadDigest: payload.payloadDigest,
    evidence: { agent, version: pkg.version, revision: pkg.revision, payloadDigest: payload.payloadDigest, checksPassed: true, closurePassed: true, noticesPassed: true, reference: artifact.acceptance?.path ?? proofSnapshots[0].path, verifiedCapabilities: receipt.verifiedCapabilities }, artifact: { source: artifact.source, snapshot: payload.snapshot }, acceptanceHash: hash(receipt) };
}

async function checkedObservation(observed, snapshots, input) {
  check(observed && names(observed.publicSkills) && observed.ownership?.manager === 'quickstark' && typeof observed.ownership.recordId === 'string', 'Legacy identity lacks explicit ownership.');
  check(observed.dirty === false && /^[a-f0-9]{40}$/.test(observed.revision), 'Legacy inspection must bind a clean observed state and immutable source revision.');
  check(observed.ownership.expected && ['path', 'canonicalPath', 'linkTarget', 'version', 'revision', 'digest'].every((field) => same(observed[field], observed.ownership.expected[field])), 'Observed ownership differs from its expected path/version/digest binding.');
  const fields = ['kind', 'identity', 'agent', 'path', 'canonicalPath', 'linkTarget', 'version', 'revision', 'digest', 'publicSkills', 'consumers'];
  const binding = Object.fromEntries(fields.map((field) => [field, observed[field] ?? (field === 'consumers' ? [] : null)]));
  const proofSnapshots = [];
  if (input.runtime?.verifyOwnership) {
    const verified = await input.runtime.verifyOwnership(observed, { homeDirectory: input.homeDirectory, document: input.document, native: input.native?.[observed.agent] });
    check(verified && same(verified.binding, binding) && Array.isArray(verified.evidenceSnapshots) && verified.evidenceSnapshots.length > 0, 'Derived ownership requires an exact binding and original evidence snapshots.');
    const originalPath = observed.kind === 'resource' ? path.join(input.homeDirectory, '.agents/.skill-lock.json')
      : observed.agent === 'codex' ? path.join(input.codexHomeDirectory ?? path.join(input.homeDirectory, '.codex'), 'config.toml') : path.join(input.homeDirectory, '.pi/agent/settings.json');
    check(verified.evidenceSnapshots.some((snapshot) => snapshot.path === originalPath), 'Derived ownership must bind the existing manager config or Agent Skills lock.');
    for (const snapshot of verified.evidenceSnapshots) { check(snapshot.kind === 'file', 'Ownership evidence must bind original regular files.'); await revalidateMigrationPath(snapshot); proofSnapshots.push(snapshot); }
  } else {
    const proof = await jsonEvidence(observed.ownership.proof);
    check(proof.value.schemaVersion === 1 && Array.isArray(proof.value.records), 'Ownership receipt schema is unsupported.');
    const matching = proof.value.records.filter((entry) => entry.recordId === observed.ownership.recordId);
    check(matching.length === 1 && same(matching[0].binding, binding), 'Ownership receipt does not bind the actual selected identity.'); proofSnapshots.push(proof.snapshot);
  }
  const payload = await captureManagedSkillPayload(observed.canonicalPath);
  check(same(payload.payloadDigest, observed.digest), 'Legacy bytes differ from the asserted baseline; retain working-tree changes and replan.');
  const actual = await captureMigrationPath(observed.path);
  if (observed.linkTarget !== null) check(actual.kind === 'symlink' && path.resolve(path.dirname(observed.path), actual.target) === observed.linkTarget, 'Legacy discovery link changed.');
  else check(observed.path === observed.canonicalPath && actual.kind === 'directory', 'Legacy canonical location is inconsistent.');
  snapshots.push(...proofSnapshots, payload.snapshot, actual);
  return { ...clone(observed), fullSnapshot: actual, canonicalSnapshot: payload.snapshot };
}

/** Read-only planning. Runtime seams must be independently validated observations,
 * never production acceptance fabricated from the synthetic integration fixtures. */
export async function previewManagedSkillMigration(input) {
  check(input && /^[a-f0-9]{40}$/.test(input.revision) && absolute(input.homeDirectory) && absolute(input.codexHomeDirectory ?? path.join(input.homeDirectory, '.codex')) && absolute(input.cwd), 'Bound release revision/user home/Codex home/checkout required.');
  const codexHomeDirectory = input.codexHomeDirectory ?? path.join(input.homeDirectory, '.codex');
  check(names(input.agents) && input.agents.length > 0 && input.agents.every((agent) => ['codex', 'pi'].includes(agent)), 'Select supported native harnesses explicitly.');
  check(Array.isArray(input.packages) && new Set(input.packages.map((pkg) => pkg.id)).size === input.packages.length && Array.isArray(input.observations), 'Explicit package catalog and ownership observations required.');
  const document = input.document ?? readSkillMigrations(); const legacyEntries = document.migrations.flatMap((entry) => entry.legacy);
  const selectionPath = input.selectionPath ?? selectionRecordPath(input.homeDirectory); const saved = await readSelectionRecord(selectionPath);
  const selectionSnapshot = await captureMigrationPath(selectionPath); const snapshots = [selectionSnapshot]; const conflicts = []; const observations = [];
  check(input.evidenceSnapshots === undefined || Array.isArray(input.evidenceSnapshots), 'Additional input evidence requires original path snapshots, not an asserted receipt.');
  const publicNames = sorted(input.packages.flatMap((pkg) => Array.isArray(pkg.publicSkills) ? pkg.publicSkills.filter((name) => names([name])) : []));
  const skillRoots = [path.join(input.homeDirectory, '.agents/skills'), ...input.agents.map((agent) => agent === 'codex' ? path.join(codexHomeDirectory, 'skills') : path.join(input.homeDirectory, '.pi/agent/skills'))];
  const evidencePaths = new Set([
    ...skillRoots.flatMap((root) => publicNames.map((name) => path.join(root, name))),
    ...input.agents.map((agent) => agent === 'codex' ? path.join(codexHomeDirectory, 'config.toml') : path.join(input.homeDirectory, '.pi/agent/settings.json')),
  ]);
  for (const snapshot of input.evidenceSnapshots ?? []) {
    try {
      check(snapshot && ['file', 'absent'].includes(snapshot.kind) && absolute(snapshot.path) && evidencePaths.has(snapshot.path), 'Additional input evidence must bind an exact selected-host public skill path or native config as a regular file or absence.');
      await revalidateMigrationPath(snapshot); snapshots.push(clone(snapshot));
    } catch (error) { conflicts.push({ reason: error.message }); }
  }
  for (const observed of input.observations.filter((entry) => input.agents.includes(entry.agent))) {
    try { observations.push(await checkedObservation(observed, snapshots, { ...input, document })); }
    catch (error) { conflicts.push({ agent: observed.agent, identity: observed.identity, reason: error.message }); }
  }
  check(new Set(observations.map(key)).size === observations.length, 'Duplicate legacy ownership observation.');
  const packageNames = sorted([...input.packages.map((pkg) => pkg.id), ...legacyEntries.filter((entry) => entry.kind === 'package').map((entry) => entry.identity)]);
  const resourceNames = sorted(legacyEntries.filter((entry) => entry.kind === 'resource').map((entry) => entry.identity));
  const targets = {}; const native = {}; const checkedPackages = {}; const selectedResources = new Map();
  for (const agent of input.agents) {
    const owned = observations.filter((entry) => entry.agent === agent); const legacy = { packages: owned.filter((entry) => entry.kind === 'package').map((entry) => entry.identity), resources: owned.filter((entry) => entry.kind === 'resource').map((entry) => entry.identity), conflicts: [] };
    let resolved;
    try { resolved = resolveTargetSelection({ agent, profiles: input.profiles, packageNames, resourceNames, savedRecord: saved.record, legacy, profile: input.profile ?? null, withPackages: input.withPackages ?? [] }); }
    catch (error) { conflicts.push({ agent, reason: error.message }); continue; }
    const selectedLegacy = legacyEntries.filter((entry) => resolved.selection[entry.kind === 'package' ? 'packages' : 'resources'].includes(entry.identity));
    const needed = sorted([...resolved.selection.packages.filter((id) => !legacyEntries.some((entry) => entry.kind === 'package' && entry.identity === id)), ...selectedLegacy.flatMap((entry) => entry.replacements.map((replacement) => replacement.packageId))]);
    const metadata = [];
    for (const id of needed) {
      const pkg = input.packages.find((entry) => entry.id === id);
      try { check(pkg, 'Selected package is unavailable.'); metadata.push(await checkedPackage(pkg, agent, input, snapshots)); }
      catch (error) { conflicts.push({ agent, packageId: id, reason: error.message }); }
    }
    checkedPackages[agent] = metadata;
    let plan;
    try { plan = planSkillMigrations({ document, agent, homeDirectory: input.homeDirectory, codexHomeDirectory, selection: resolved.selection, packages: metadata, observations: owned,
      explicitPackages: input.withPackages ?? [], explicitProfile: input.profile ? { source: 'user-request', id: input.profile, packages: input.profiles.profiles[input.profile].packages } : null }); }
    catch (error) { conflicts.push({ agent, reason: error.message }); plan = { schemaVersion: 1, agent, status: 'blocked', selection: resolved.selection, migrations: [], mutationAuthorized: false }; }
    for (const migration of plan.migrations) {
      for (const conflict of migration.conflicts) conflicts.push({ agent, migrationId: migration.migrationId, ...conflict });
      for (const addition of migration.additions) conflicts.push({ agent, migrationId: migration.migrationId, reason: 'explicit-package-expansion-required', ...addition });
    }
    const ready = plan.migrations.filter((migration) => migration.status === 'ready-to-stage');
    const replacing = ready.flatMap((migration) => migration.retained);
    const desired = { ...resolved.selection, packages: sorted([...resolved.selection.packages.filter((id) => !replacing.some((entry) => entry.kind === 'package' && entry.identity === id)), ...ready.flatMap((migration) => migration.targets.map((target) => target.packageId))]), resources: resolved.selection.resources.filter((id) => !replacing.some((entry) => entry.kind === 'resource' && entry.identity === id)) };
    if (input.profile && (resolved.retirements.packages.length || resolved.retirements.resources.length)) conflicts.push({ agent, reason: 'explicit-selection-removal-needs-separate-retirement', retained: resolved.retirements });
    for (const resource of replacing.filter((entry) => entry.kind === 'resource')) {
      const observed = owned.find((entry) => entry.kind === 'resource' && entry.identity === resource.identity); if (!observed) continue;
      const absentConsumers = observed.consumers.filter((consumer) => !input.agents.includes(consumer));
      if (absentConsumers.length) conflicts.push({ agent, identity: resource.identity, reason: 'shared-consumer-still-requires-old-resource', consumers: absentConsumers });
      // Shared identity does not make independently verified host discovery paths interchangeable.
      selectedResources.set(key(observed), observed);
    }
    targets[agent] = { basis: resolved.basis, original: resolved.selection, desired, migrations: plan };
    const nativeInput = input.native?.[agent];
    try {
      check(nativeInput && Array.isArray(nativeInput.packages), 'Native bindings are unavailable.');
      const options = { ...nativeInput, host: agent, homeDirectory: input.homeDirectory, codexHomeDirectory, cwd: input.cwd };
      const observation = await (input.runtime?.observeNativePackages ?? observeNativePackages)(options);
      for (const actual of observation.state.native.packages) {
        const binding = nativeInput.packages.find((entry) => entry.id === actual.id); check(binding, 'Observed native package lacks an ownership binding.');
        if (resolved.selection.packages.includes(binding.name)) {
          const livePath = agent === 'codex' ? path.join(codexHomeDirectory, 'plugins/cache', binding.marketplace, binding.name, actual.version) : binding.source;
          check(owned.some((entry) => entry.kind === 'package' && entry.identity === binding.name && entry.version === actual.version && entry.canonicalPath === livePath && entry.canonicalSnapshot.contentSha256 === binding.payloadSha256 && same([...entry.publicSkills].sort(), [...actual.publicNames].sort())), 'Selected native ownership does not bind actual live cache/source bytes; retained archives are separate evidence.');
        }
      }
      for (const prior of owned.filter((entry) => entry.kind === 'package' && resolved.selection.packages.includes(entry.identity))) check(observation.state.native.packages.some((actual) => {
        const binding = nativeInput.packages.find((entry) => entry.id === actual.id); return binding?.name === prior.identity && actual.version === prior.version;
      }), 'Selected owned legacy package is not observable in the native manager; hidden caches are not installed-state evidence.');
      for (const id of desired.packages) {
        const pkg = metadata.find((entry) => entry.id === id); check(pkg, 'Desired package lacks verified acceptance.');
        const binding = nativeInput.packages.find((entry) => entry.name === id && entry.version === pkg.version && entry.source === pkg.artifact.source && entry.payloadSha256 === pkg.artifact.snapshot.contentSha256 && !entry.installedOnly);
        check(binding && same([...binding.publicNames].sort(), [...pkg.publicSkills].sort()), 'Desired package does not match exact native source/version/public-identity bindings.');
      }
      native[agent] = { options: { host: agent, homeDirectory: input.homeDirectory, codexHomeDirectory, cwd: input.cwd, packages: nativeInput.packages, ...(nativeInput.command ? { command: nativeInput.command } : {}) }, state: observation.state };
      if (observation.evidence?.configSnapshot) snapshots.push(observation.evidence.configSnapshot);
    } catch (error) { conflicts.push({ agent, reason: error.message }); }
  }
  for (const observed of selectedResources.values()) for (const consumer of observed.consumers) {
    if (targets[consumer] && !targets[consumer].migrations.migrations.some((migration) => migration.status === 'ready-to-stage' && migration.retained.some((entry) => entry.kind === 'resource' && entry.identity === observed.identity))) conflicts.push({ identity: observed.identity, reason: 'shared-consumer-migration-not-ready', consumer });
  }
  const lockPath = path.join(input.homeDirectory, '.agents/.skill-lock.json'); let lock = null; let lockSnapshot = null;
  if (selectedResources.size) {
    try {
      lockSnapshot = await captureMigrationPath(lockPath); check(lockSnapshot.kind === 'file' && lockSnapshot.bytes <= 1024 * 1024, 'Managed resource lock is unavailable or unsafe.');
      try { lock = JSON.parse(await readFile(lockPath)); } catch { throw new Error('Managed resource lock JSON is invalid; contents withheld.'); }
      await revalidateMigrationPath(lockSnapshot); check(lock.version === 3 && lock.skills && typeof lock.skills === 'object' && !Array.isArray(lock.skills), 'Unsupported managed resource lock.');
      for (const id of sorted([...selectedResources.values()].map((resource) => resource.identity))) {
        const resource = document.sourceManifestSnapshot.resources.find((entry) => entry.name === id);
        check(resource && lockEntryMatches(lock.skills[id], { type: 'agent-skill', source: resource.source }), 'Managed resource lock differs from its immutable contributor baseline.');
      }
      snapshots.push(lockSnapshot);
    } catch (error) { conflicts.push({ reason: error.message }); }
  }
  const snapshotMap = new Map();
  for (const snapshot of snapshots) { const prior = snapshotMap.get(snapshot.path); check(!prior || same(prior, snapshot), 'Evidence changed while building the migration preview.'); snapshotMap.set(snapshot.path, snapshot); }
  const uniqueSnapshots = [...snapshotMap.values()];
  const result = { schemaVersion: 1, revision: input.revision, homeDirectory: input.homeDirectory, codexHomeDirectory, cwd: input.cwd, agents: input.agents, status: conflicts.length ? 'blocked' : 'ready', conflicts,
    targets, native, packages: checkedPackages, observations, resources: [...selectedResources.values()], selectionPath, previousSelection: saved.record, selectionFingerprint: saved.fingerprint, selectionSnapshot,
    lock: lock ? { path: lockPath, value: lock, snapshot: lockSnapshot } : null, snapshots: uniqueSnapshots, inputHash: hash({ document, profiles: input.profiles, profile: input.profile ?? null, withPackages: input.withPackages ?? [] }), mutationAuthorized: false };
  return freeze({ ...clone(result), previewHash: hash(result) });
}

function ownedStep(id, phase, target, beforeSnapshot, after, pathAction, record) {
  return { id, phase, adapter: 'owned', operation: pathAction.kind, ownedTargets: [{ path: target, ownershipRecord: record }], before: ownedPathState(beforeSnapshot), after, pathAction: { ...pathAction, beforeSnapshot } };
}

/** Assembles explicit effects only. Does not create directories, stage data, or
 * execute native commands. Parent supplies proven production acceptance receipts. */
export async function assembleManagedSkillMigration(preview, { transactionId, stagingRoot, backupRoot, journalPath, runtime = {} }) {
  const { previewHash, ...contents } = preview;
  check(previewHash === hash(contents) && preview.status === 'ready' && !preview.conflicts.length, 'Migration preview is changed, blocked, or unverified.');
  check(/^[a-z0-9][a-z0-9-]*$/.test(transactionId) && absolute(stagingRoot) && absolute(backupRoot) && absolute(journalPath), 'Exact transaction/staging/backup/journal locations required.');
  check(path.dirname(journalPath) === stagingRoot, 'Journal parent must establish the outside-discovery staging root before copy phases.');
  for (const snapshot of preview.snapshots) await revalidateMigrationPath(snapshot);
  const discoveryRoots = sorted([path.join(preview.homeDirectory, '.agents/skills'), path.join(preview.homeDirectory, '.claude/skills'), path.join(preview.homeDirectory, '.pi/agent/skills'),
    ...(preview.agents.includes('codex') ? [path.join(preview.codexHomeDirectory, 'skills'), path.join(preview.codexHomeDirectory, 'plugins/cache')] : [])]);
  const steps = []; const adapters = { owned: (runtime.createOwnedPathAdapter ?? createOwnedPathAdapter)({ backupRoot: path.join(backupRoot, 'paths'), discoveryRoots }) };
  const staged = new Set();
  for (const agent of preview.agents) for (const pkg of preview.packages[agent]) {
    if (!preview.targets[agent].desired.packages.includes(pkg.id) || staged.has(pkg.artifact.source)) continue; staged.add(pkg.artifact.source);
    const destination = path.join(stagingRoot, `${agent}-${pkg.id}`); const before = await captureMigrationPath(destination); check(before.kind === 'absent', 'Stage destination already exists; resume the original transaction instead.');
    steps.push(ownedStep(`stage-${agent}-${pkg.id}`, 'stage', destination, before, ownedPathState(pkg.artifact.snapshot, destination), { kind: 'copy', sourceSnapshot: pkg.artifact.snapshot }, `accepted:${pkg.acceptanceHash}`));
  }
  const exposures = [];
  for (const agent of preview.agents) {
    const native = preview.native[agent];
    check(Object.keys(runtime.nativeOptions?.[agent] ?? {}).every((key) => ['command', 'runCommand'].includes(key)), 'Runtime overrides cannot change native source or ownership bindings.');
    const options = { ...native.options, ...(runtime.nativeOptions?.[agent] ?? {}), backupRoot: path.join(backupRoot, agent) };
    const adapterId = `native-${agent}`; adapters[adapterId] = (runtime.createNativePackageAdapter ?? createNativePackageAdapter)(options);
    let before = native.state; const desired = preview.targets[agent].desired.packages;
    const required = new Map(desired.map((id) => [id, preview.packages[agent].find((pkg) => pkg.id === id)]));
    const ownedTargets = [{ path: native.state.configPath, ownershipRecord: native.options.packages[0].ownershipRecord }, ...(agent === 'codex' ? native.options.packages.map((pkg) => ({ path: path.join(preview.codexHomeDirectory, 'plugins/cache', pkg.marketplace, pkg.name, pkg.version), ownershipRecord: pkg.ownershipRecord })) : [])];
    const change = (binding, phase) => {
      const after = predictNativePackageTransition(before, { packageId: binding.id, phase, packages: native.options.packages });
      const targets = clone(ownedTargets); targets[0].ownershipRecord = binding.ownershipRecord;
      const step = { id: `${phase}-${agent}-${binding.id}`, phase, operation: `native-${phase}`, adapter: adapterId, native: { host: agent, packageId: binding.id }, ownedTargets: targets, before, after };
      before = after; return step;
    };
    for (const actual of native.state.native.packages) {
      const binding = native.options.packages.find((entry) => entry.id === actual.id); const expected = required.get(binding.name);
      const selectedBefore = preview.targets[agent].original.packages.includes(binding.name);
      if (selectedBefore && (!expected || expected.version !== actual.version || binding.installedOnly)) steps.push(change(binding, 'withdraw'));
    }
    for (const id of desired) {
      const pkg = required.get(id); const binding = native.options.packages.find((entry) => entry.name === id && entry.version === pkg.version && !entry.installedOnly);
      if (!before.native.packages.some((entry) => entry.id === binding.id)) exposures.push(change(binding, 'expose'));
    }
  }
  const resourcePaths = new Map();
  for (const resource of preview.resources) {
    for (const snapshot of [resource.fullSnapshot, resource.canonicalSnapshot]) {
      if (!resourcePaths.has(snapshot.path)) resourcePaths.set(snapshot.path, { snapshot, ownershipRecord: resource.ownership.recordId });
    }
  }
  // Remove every alias before shared content; reverse recovery restores content before aliases.
  const retirements = [...resourcePaths.values()].sort((a, b) => Number(a.snapshot.kind !== 'symlink') - Number(b.snapshot.kind !== 'symlink'));
  for (const [index, { snapshot, ownershipRecord }] of retirements.entries()) {
    steps.push(ownedStep(`withdraw-resource-${index + 1}`, 'withdraw', snapshot.path, snapshot, { kind: 'absent', path: snapshot.path }, { kind: 'retire' }, ownershipRecord));
  }
  steps.push(...exposures);
  if (preview.lock) {
    const value = clone(preview.lock.value); for (const identity of sorted(preview.resources.map((resource) => resource.identity))) delete value.skills[identity];
    const contents = JSON.stringify(value, null, 2) + '\n'; const mode = preview.lock.snapshot.entries[0].mode;
    steps.push(ownedStep('retire-resource-lock', 'retire', preview.lock.path, preview.lock.snapshot, ownedFileState(preview.lock.path, contents, mode), { kind: 'write-state', contents, mode }, 'verified-contributor-lock'));
  }
  const record = normalizeSelectionRecord({ schemaVersion: 1, targets: { ...(preview.previousSelection?.targets ?? {}), ...Object.fromEntries(preview.agents.map((agent) => [agent, preview.targets[agent].desired])) }, templateRevision: preview.revision, lastSuccessfulTransaction: transactionId });
  const contentsToSave = JSON.stringify(record, null, 2) + '\n'; const mode = preview.selectionSnapshot.kind === 'file' ? preview.selectionSnapshot.entries[0].mode : 0o600;
  steps.push(ownedStep('save-selection', 'state', preview.selectionPath, preview.selectionSnapshot, ownedFileState(preview.selectionPath, contentsToSave, mode), { kind: 'write-state', contents: contentsToSave, mode }, 'verified-saved-selection'));
  const ownedRoots = sorted([preview.homeDirectory, stagingRoot,
    ...(!inside(preview.codexHomeDirectory, preview.homeDirectory) ? [preview.codexHomeDirectory] : [])]);
  const plan = { schemaVersion: 1, id: transactionId, revision: preview.revision, evidenceHash: preview.previewHash, discoveryRoots, stagingRoots: [stagingRoot], ownedRoots, steps,
    controlPlane: { schemaVersion: 1, backupRoot, nativeOptions: Object.fromEntries(preview.agents.map((agent) => [agent, preview.native[agent].options])), evidenceSnapshots: preview.snapshots } };
  validateMigrationTransactionPlan(plan, journalPath);
  return { plan: freeze(clone(plan)), journalPath, adapters, preview, runtime };
}

export async function executeManagedSkillMigration(assembly, { ownerId, mode = 'forward', recoveryAuthority = null } = {}) {
  // Revalidation of actual step state on retry belongs to the durable coordinator.
  // Acceptance/source evidence still must match even when previous effects exist.
  const mutated = new Set(assembly.plan.steps.flatMap((step) => step.ownedTargets.map((target) => target.path)));
  const existing = await readMigrationJournal(assembly.journalPath);
  for (const snapshot of assembly.preview.snapshots) if (!existing || !mutated.has(snapshot.path)) await revalidateMigrationPath(snapshot);
  return runMigrationTransaction({ journalPath: assembly.journalPath, plan: assembly.plan, adapters: assembly.adapters, ownerId, mode, recoveryAuthority });
}

/** Restore a serialized transaction, not a new plan inferred from partial effects. */
export async function restoreManagedSkillMigration({ journalPath, runtime = {} }) {
  const journal = await readMigrationJournal(journalPath); check(journal, 'No migration journal exists to resume.');
  const plan = journal.plan; validateMigrationTransactionPlan(plan, journalPath);
  const binding = plan.controlPlane;
  check(binding?.schemaVersion === 1 && absolute(binding.backupRoot) && Array.isArray(binding.evidenceSnapshots), 'Journal lacks bounded control-plane bindings.');
  const adapters = { owned: (runtime.createOwnedPathAdapter ?? createOwnedPathAdapter)({ backupRoot: path.join(binding.backupRoot, 'paths'), discoveryRoots: plan.discoveryRoots }) };
  for (const [agent, options] of Object.entries(binding.nativeOptions)) {
    check(['codex', 'pi'].includes(agent) && options.host === agent && Object.keys(runtime.nativeOptions?.[agent] ?? {}).every((key) => ['command', 'runCommand'].includes(key)), 'Invalid resumed native binding or runtime override.');
    adapters[`native-${agent}`] = (runtime.createNativePackageAdapter ?? createNativePackageAdapter)({ ...options, ...(runtime.nativeOptions?.[agent] ?? {}), backupRoot: path.join(binding.backupRoot, agent) });
  }
  return { journalPath, plan: freeze(clone(plan)), adapters, preview: { snapshots: binding.evidenceSnapshots }, runtime };
}
