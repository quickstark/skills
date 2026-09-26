import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { here, repository, priorRoot, sha, verifyBindings, verifyPlan } from './verify.mjs';

const [flag, adapterHash, helperFlag, helperHash] = process.argv.slice(2);
if (process.argv.length !== 6 || flag !== '--reviewed-adapter-sha256' || helperFlag !== '--reviewed-process-helper-sha256' || !/^[a-f0-9]{64}$/.test(adapterHash ?? '') || !/^[a-f0-9]{64}$/.test(helperHash ?? '')) throw new Error('Final reviewed adapter and process-helper hashes required; no launch performed');
await verifyBindings({ 'scripts/frontend-native-capture.mjs': adapterHash, 'scripts/frontend-adoption-trials.mjs': helperHash });
const prior = JSON.parse(await readFile(join(priorRoot, 'amendments/render-report-host-recovery-plan.json')));
const names = ['scripts/frontend-native-capture.mjs', 'scripts/frontend-adoption-trials.mjs',
  ...['run.mjs', 'support.mjs', 'verify.mjs', 'freeze.mjs', 'support.test.mjs', 'README.md'].map(n => 'tests/fixtures/adoption-video-native/' + n),
  ...['amendments/render-report-host-recovery-plan.json', 'amendments/run-render-report-host-recovery.mjs', 'amendments/proof-launch-support.mjs',
    'amendments/render-report-proof-root.md', 'amendments/render-report-proof-rubric.json', 'render-prompt.txt', 'oracle.py',
    'runs/render-report-proof-01-host-init-recovery/archive-sha256.json', 'runs/render-report-proof-01-host-init-recovery/archive-layout.json',
    'amendments/exec-json-observability/audit-sha256.json', 'parent/host-recovery-review.json'].map(n => 'tests/fixtures/adoption-video-routing/' + n), prior.executable, process.execPath];
const bindings = Object.fromEntries(await Promise.all(names.map(async name => [name, sha(await readFile(name.startsWith('/') ? name : join(repository, name)))])));
const plan = {
  schemaVersion: 1, id: 'render-report-native-01', frozenAt: new Date().toISOString(),
  state: 'Prepared only; separate parent launch review required. No model or runtime render during preparation.',
  workspace: '/tmp/qs-video-native-workspace-20260926', captureDirectory: '/tmp/qs-video-native-capture-20260926',
  executable: prior.executable, nodeExecutable: process.execPath, nodeVersion: process.version,
  expectedControls: { ...prior.modelControls, approvals_reviewer: 'auto_review' },
  timeoutMs: 360000, maximumImageCalls: 0, attempts: 1, retries: 0,
  change: 'New separate app-server native-protocol capture. Inherits and verifies all five configured controls against thread/start before turn/start. Approval behavior follows native on-request/auto_review rather than assuming exec CLI semantics match. Unsupported interactive approval requests stop unverified; no auto-grant or override.',
  unchanged: 'Exact prior render task, source/assets/project, runtime wrapper/profile/pin, current amended root/private closure, reporting rubric and independent oracle. Guidance remains immutable at existing paths until launch copies it to the exclusive workspace.',
  historyPolicy: 'Preserve original render/reporting failures and all later qualified observability findings. Missing exec image events cannot establish absent inspection. New evidence cannot repair prior grades; no pooling or adoption conclusion.',
  bindings,
  transitiveBindings: 'Bound prior plan supplies all1003 inputs,923 canonical source records and1114 preserved archive records; verify every referenced byte before launch. No large guidance duplication during preparation.',
  archives: [
    { manifest: 'tests/fixtures/adoption-video-routing/runs/render-report-proof-01-host-init-recovery/archive-sha256.json', base: 'tests/fixtures/adoption-video-routing/runs/render-report-proof-01-host-init-recovery' },
    { manifest: 'tests/fixtures/adoption-video-routing/amendments/exec-json-observability/audit-sha256.json', base: 'tests/fixtures/adoption-video-routing/amendments/exec-json-observability' }
  ],
  oracle: 'After capture only: python3 tests/fixtures/adoption-video-routing/oracle.py /tmp/qs-video-native-capture-20260926/after. Independent output measurements never establish what the model inspected in-turn.',
  acceptance: 'Parent independent review of native complete stream, all shell/MCP/delegation semantics, output preservation and claim-to-view/measurement attribution; native transport success and observedNamedImageCalls alone are not acceptance.'
};
const result = await verifyPlan(plan);
await writeFile(join(here, 'plan.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
await writeFile(join(here, 'preparation-verification.json'), JSON.stringify({ ...result, planSHA256: sha(await readFile(join(here, 'plan.json'))), mode: 'Read-only bindings and five selected configuration fields; no app-server, model, browser or render process launched.' }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ prepared: true, ...result }));
