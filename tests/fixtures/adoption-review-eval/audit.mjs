import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifest, sha } from '../../../scripts/frontend-adoption-trials.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const target = join(root, 'minimal');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const bindingChecks = [];
for (const directory of [root, target]) {
  const plan = await readJson(join(directory, 'plan.json'));
  for (const [file, expected] of Object.entries(plan.files)) {
    const actual = sha(await readFile(join(directory, file)));
    if (actual !== expected.sha256) throw new Error(`Frozen artifact changed: ${directory}/${file}`);
  }
  bindingChecks.push({ planSHA256: sha(await readFile(join(directory, 'plan.json'))), frozenFilesVerified: Object.keys(plan.files).length });
}
const run = join(target, 'runs/current-01');
const index = await readJson(join(run, 'index.json'));
for (const [file, expected] of Object.entries(index.files)) if (sha(await readFile(join(run, file))) !== expected.sha256) throw new Error(`Capture artifact changed: ${file}`);
const cases = [];
for (const caseId of ['A7', 'E7']) {
  const directory = join(run, caseId);
  const context = await readJson(join(directory, 'review-context.json'));
  const before = await manifest(join(directory, 'before'));
  const after = await manifest(join(directory, 'after'));
  if (JSON.stringify(before) !== JSON.stringify(context.before) || JSON.stringify(after) !== JSON.stringify(context.after)) throw new Error(`Snapshot binding mismatch: ${caseId}`);
  const changedOrMissing = Object.keys(before).filter(p => before[p].sha256 !== after[p]?.sha256);
  const newFiles = Object.keys(after).filter(p => !before[p]);
  const forbiddenNewFiles = newFiles.filter(p => !p.startsWith('review-output/'));
  const events = (await readFile(join(directory, 'events.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
  const tools = events.filter(e => e.type === 'item.completed' && e.item && !['agent_message', 'reasoning', 'plan'].includes(e.item.type)).map(e => e.item);
  const response = await readFile(join(directory, 'response.md'), 'utf8');
  const reports = await Promise.all(newFiles.filter(p => p.startsWith('review-output/')).map(async path => ({ path, contents: await readFile(join(directory, 'after', path), 'utf8') })));
  const text = response + '\n' + reports.map(p => p.contents).join('\n');
  cases.push({ caseId, originalFilesVerified: Object.keys(before).length, changedOrMissing, newFiles, forbiddenNewFiles, originalsAndWriteScopePass: changedOrMissing.length === 0 && forbiddenNewFiles.length === 0, reportFiles: reports.map(p => p.path), allThreeSampleLabelsPresentInReportedEvidence: caseId === 'E7' ? ['sample-01','sample-02','sample-03'].every(id => text.includes(id)) : null, previousDecisionLabelsPresentInReportedEvidence: caseId === 'E7' ? ['decision-01','decision-02'].every(id => text.includes(id)) : null, tools, execution: { exitCode: context.telemetry?.exitCode, completedTurn: context.telemetry?.completedTurn, timedOut: context.telemetry?.timedOut, processObservation: context.telemetry?.processObservation, observedOwnedResidualProcesses: context.telemetry?.observedOwnedResidualProcesses }, manualReviewRequired: 'Inspect full tool commands and outputs, review claims, actual original/new reports and historical links. String presence or successful runtime completion is not a semantic pass.' });
}
const result = { schemaVersion: 1, bindingChecks, captureIndexSHA256: sha(await readFile(join(run, 'index.json'))), captureFilesVerified: Object.keys(index.files).length, cases, semanticAcceptance: 'Pending independent parent review; no E1 regrade or candidate performance conclusion.' };
const output = process.argv[2] ?? join(target, 'objective-checks.json');
await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, structuralPass: cases.every(c => c.originalsAndWriteScopePass), cases: cases.map(c => ({ caseId: c.caseId, originals: c.originalFilesVerified, newFiles: c.newFiles })) }, null, 2));
