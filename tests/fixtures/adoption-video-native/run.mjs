import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.argv.length !== 3 || process.argv[2] !== '--parent-reviewed-native-video-trial') throw new Error('Separate parent-reviewed native video launch required');
const here = dirname(fileURLToPath(import.meta.url)), repository = resolve(here, '../../..');
const bytes = await readFile(join(here, 'plan.json')), plan = JSON.parse(bytes);
const sha = b => createHash('sha256').update(b).digest('hex');
// Verify executable helper bytes before importing their code.
for (const [name, expected] of Object.entries(plan.bindings)) if (sha(await readFile(resolve(repository, name))) !== expected) throw new Error('Bound file changed: ' + name);
const { verifyPlan, priorRoot } = await import('./verify.mjs');
const verified = await verifyPlan(plan);
const { executeNative, readNativeControls } = await import('../../../scripts/frontend-native-capture.mjs');
const { manifest } = await import('../../../scripts/frontend-adoption-trials.mjs');
const { captureWithAfterState } = await import('../adoption-video-routing/amendments/proof-launch-support.mjs');
const { assertControls, signalExactProcess, captureSucceeded } = await import('./support.mjs');
const directory = plan.captureDirectory, cwd = plan.workspace;
const json = (name, value) => writeFile(join(directory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
let interruptionSignal = null, signalled = false, killTimer = null;
const stopEvents = [];
function stopOwned() {
  if (!interruptionSignal || signalled) return;
  let record; try { record = JSON.parse(readFileSync(join(directory, 'process.json'), 'utf8')); } catch { return; }
  try {
    if (!signalExactProcess(record, 'SIGTERM')) return;
    signalled = true; stopEvents.push({ ...record, action: 'SIGTERM', reason: interruptionSignal });
    killTimer = setTimeout(() => {
      try { if (signalExactProcess(record, 'SIGKILL')) stopEvents.push({ pid: record.pid, identity: record.identity, action: 'SIGKILL' }); }
      catch (e) { stopEvents.push({ action: 'SIGKILL failed', code: e.code }); }
    }, 5000);
  } catch (e) { stopEvents.push({ action: 'SIGTERM failed', code: e.code }); }
}
const handlers = Object.fromEntries(['SIGINT', 'SIGTERM'].map(signal => [signal, () => { interruptionSignal ??= signal; stopOwned(); }]));
for (const [signal, handler] of Object.entries(handlers)) process.on(signal, handler);
await mkdir(directory); // exclusive; a started attempt is never reused
const timer = setInterval(stopOwned, 100);
let result;
try {
  result = await captureWithAfterState({ directory, cwd, manifest, capture: async () => {
    await mkdir(cwd);
    await cp(join(priorRoot, 'project'), cwd, { recursive: true });
    await cp(join(priorRoot, 'guidance'), join(cwd, 'guidance'), { recursive: true });
    await cp(join(priorRoot, 'amendments/render-report-proof-root.md'), join(cwd, 'guidance/instructions.md'));
    await cp(cwd, join(directory, 'before'), { recursive: true });
    await json('before-binding.json', await manifest(cwd));
    await json('run-binding.json', { id: plan.id, planSHA256: sha(bytes), node: process.version, nodeExecutable: process.execPath, verified });
    if (interruptionSignal) throw new Error('Interrupted before native capture');
    await json('pre-capture-controls.json', assertControls(plan.expectedControls, readNativeControls()));
    return executeNative({ prompt: await readFile(join(priorRoot, 'render-prompt.txt'), 'utf8'), cwd, directory,
      executable: plan.executable, expectedControls: plan.expectedControls,
      scenario: { mode: 'implementation', budget: { timeoutMs: plan.timeoutMs, maximumImageCalls: plan.maximumImageCalls } } });
  } });
} finally {
  clearInterval(timer); clearTimeout(killTimer);
  for (const [signal, handler] of Object.entries(handlers)) process.off(signal, handler);
  await json('supervisor-interruption.json', { interruptionSignal, stopEvents });
}
const success = captureSucceeded(result, interruptionSignal);
await json('supervisor-outcome.json', { id: plan.id, captureTransportComplete: Boolean(success), captureError: result.captureError, snapshotErrors: result.snapshotErrors,
  note: 'Transport completion is not a behavior, reporting, output-quality or zero-image-call acceptance decision; independent review and unchanged oracle still required.' });
console.log(JSON.stringify({ id: plan.id, directory, cwd, captureTransportComplete: Boolean(success), captureError: result.captureError, snapshotErrors: result.snapshotErrors, interruptionSignal }));
if (!success) process.exitCode = 1;
