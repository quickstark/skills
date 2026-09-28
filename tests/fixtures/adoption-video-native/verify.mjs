import { readFile, access, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const here = dirname(fileURLToPath(import.meta.url));
export const repository = resolve(here, '../../..');
export const priorRoot = resolve(here, '../adoption-video-routing');
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export async function verifyBindings(entries, base = repository) {
  for (const [name, expected] of Object.entries(entries)) {
    if (sha(await readFile(resolve(base, name))) !== expected) throw new Error('Bound bytes changed: ' + name);
  }
}
export async function verifyExactTree(root, expectedNames) {
  const names = [];
  async function visit(directory, prefix = '') {
    for (const name of await readdir(directory)) {
      const p = join(directory, name), key = prefix + name, stat = await lstat(p);
      if (stat.isSymbolicLink()) throw new Error('Symlink outside frozen input contract: ' + key);
      if (stat.isDirectory()) await visit(p, key + '/');
      else if (stat.isFile()) names.push(key);
      else throw new Error('Unsupported input type: ' + key);
    }
  }
  await visit(root);
  if (JSON.stringify(names.sort()) !== JSON.stringify([...expectedNames].sort())) throw new Error('Input tree membership changed: ' + root);
}
export async function verifyPlan(plan, { requireFreshPaths = true } = {}) {
  await verifyBindings(plan.bindings);
  const old = JSON.parse(await readFile(join(priorRoot, 'amendments/render-report-host-recovery-plan.json')));
  for (const [key, base] of [['files', priorRoot], ['canonicalSources', repository], ['preservedArchiveFiles', priorRoot]]) await verifyBindings(old[key], base);
  for (const prefix of ['project/', 'guidance/']) await verifyExactTree(join(priorRoot, prefix), Object.keys(old.files).filter(n => n.startsWith(prefix)).map(n => n.slice(prefix.length)));
  const canonicalPrefix = 'skills/video/qs-video/';
  await verifyExactTree(join(repository, canonicalPrefix), Object.keys(old.canonicalSources).map(n => n.slice(canonicalPrefix.length)));
  for (const entry of plan.archives) await verifyBindings(JSON.parse(await readFile(resolve(repository, entry.manifest))), resolve(repository, entry.base));
  const profile = JSON.parse(await readFile(join(priorRoot, 'project/tools/runtime-profile.json')));
  await verifyBindings(Object.fromEntries(Object.values(profile.files).map(v => [v.path, v.sha256])));
  if (plan.timeoutMs !== 360000 || plan.maximumImageCalls !== 0 || plan.attempts !== 1 || plan.retries !== 0) throw new Error('Budget or retry contract changed');
  if (plan.workspace !== '/tmp/qs-video-native-workspace-20260926' || plan.captureDirectory !== '/tmp/qs-video-native-capture-20260926') throw new Error('Unexpected native trial paths');
  if (sha(await readFile(plan.executable)) !== old.executableSHA256) throw new Error('Codex executable differs from prior trial');
  if (sha(await readFile(join(priorRoot, 'render-prompt.txt'))) !== old.unchangedPromptSHA256) throw new Error('Task changed');
  const canonical = sha(await readFile(join(repository, 'skills/video/qs-video/SKILL.md')));
  if (canonical !== old.amendedRootSHA256 || sha(await readFile(join(priorRoot, 'amendments/render-report-proof-root.md'))) !== canonical) throw new Error('Current root differs from prior amended guidance');
  if (requireFreshPaths) for (const path of [plan.workspace, plan.captureDirectory]) {
    try { await access(path); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
    throw new Error('Attempt path already exists; reuse forbidden: ' + path);
  }
  const { readNativeControls } = await import(pathToFileURL(join(repository, 'scripts/frontend-native-capture.mjs')));
  const { assertControls } = await import('./support.mjs');
  const controls = assertControls(plan.expectedControls, readNativeControls());
  return { controls, verifiedOldInputs: Object.keys(old.files).length, verifiedCanonicalSources: Object.keys(old.canonicalSources).length, verifiedPreservedHistory: Object.keys(old.preservedArchiveFiles).length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('Verification accepts no overrides');
  console.log(JSON.stringify(await verifyPlan(JSON.parse(await readFile(join(here, 'plan.json'))))));
}
