import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha } from '../../../scripts/frontend-adoption-trials.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), 'minimal');
const after = join(root, 'runs/current-01/E7/after');
const entries = (await readFile(join(after, 'review-output/audit-corrections.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
const archive = JSON.parse(await readFile(join(after, 'history/archive-before-replacement.json')));
const history = entries.find(x => x.kind === 'linked-audit-correction');
const assessment = entries.find(x => x.kind === 'linked-batch-assessment');
const hashes = JSON.parse(await readFile(join(after, 'review-output/evidence-sha256.json')));
for (const [path, hash] of Object.entries(hashes.files)) if (sha(await readFile(join(after, path))) !== hash) throw new Error(`Report hash mismatch: ${path}`);
if (JSON.stringify(history.archivedRecord) !== JSON.stringify(archive)) throw new Error('Prior failure was rewritten.');
if (!history.corrects.includes('decision-02') || !history.preserves.includes('decision-01')) throw new Error('Missing historical links.');
const status = Object.fromEntries(assessment.samples.map(x => [x.id, x.status]));
if (JSON.stringify(status) !== JSON.stringify({ 'sample-01': 'passed', 'sample-02': 'passed', 'sample-03': 'failed', 'sample-04': 'missing' })) throw new Error('Incorrect sample dispositions.');
if (assessment.passed !== 2 || assessment.failed !== 1 || assessment.missing !== 1 || assessment.declaredSampleCount !== 4 || assessment.returnedSampleCount !== 3) throw new Error('Incorrect counts.');
if (assessment.comparativeClaim !== 'unsupported' || assessment.adoptionClaim !== 'unsupported') throw new Error('Unwarranted decision.');
const report = await readFile(join(after, 'review-output/review.md'), 'utf8');
let links = 0;
for (const match of report.matchAll(/\]\(([^)]+)\)/g)) { await readFile(resolve(after, 'review-output', match[1])); links++; }
const result = { originalArchivedDecisionPreservedExactly: true, correctionLinksBothDecisions: true, allFourDispositionsAndCountsCorrect: true, comparativeAndAdoptionClaimsRejected: true, reportHashBindingsVerified: Object.keys(hashes.files).length, reviewLinksResolved: links, correctionRecordCount: entries.length, limitations: ['Independent checks inspect outputs; they do not execute model-authored commands.', 'New sidecar records extend the audit trail while original history stays immutable; no file append to an original ledger is authorized.'] };
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
