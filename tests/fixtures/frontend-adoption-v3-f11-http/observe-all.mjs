import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import { observeHttp, verifyPlan, snapshot, sha } from './observer.mjs';

export async function verifyInputs() {
  const plan = await verifyPlan();
  if (plan.bundles.length !== 6 || new Set(plan.bundles.map(x => x.reviewId)).size !== 6) throw new Error('Exactly six frozen opaque F11 inputs required.');
  for (const row of plan.bundles) {
    const bytes = await readFile(row.context);
    if (sha(bytes) !== row.contextSha256 || JSON.parse(bytes).task.id !== 'F11') throw new Error('Frozen F11 context changed.');
    const current = (await snapshot(row.project)).manifest;
    if (!isDeepStrictEqual(current, row.manifest)) throw new Error(`Frozen artifact changed: ${row.reviewId}`);
  }
  return plan;
}
export async function observeAll(output) {
  const plan = await verifyInputs(); output = resolve(output);
  for (const row of plan.bundles) if (output === row.project || output.startsWith(row.project + '/') || row.project.startsWith(output + '/')) throw new Error('Output must be disjoint from every original artifact.');
  await mkdir(output); // Fresh root required; no replacement or implicit retry.
  const inventory = { schemaVersion: 1, planSha256: sha(await readFile(new URL('./plan.json', import.meta.url))), expected: 6, records: [], qualityJudgment: 'No quality grades; supplement preserves every original failure and output.' };
  for (const row of plan.bundles) {
    const target = join(output, row.reviewId); let failure = null;
    try { await observeHttp({ project: row.project, output: target, browser: plan.runtime.browserPath, puppeteer: plan.runtime.puppeteerPath }); }
    catch (error) { failure = error.stack; }
    let files = null;
    try { files = (await snapshot(target)).manifest; } catch (error) { failure = [failure, error.stack].filter(Boolean).join('\n'); }
    inventory.records.push({ reviewId: row.reviewId, project: row.project, output: target, failure, files });
    await writeFile(join(output, `inventory-through-${inventory.records.length}.json`), JSON.stringify(inventory, null, 2) + '\n', { flag: 'wx' });
  }
  return inventory;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, output] = process.argv.slice(2);
  if (command === 'verify' && !output) { await verifyInputs(); console.log('F11_SUPPLEMENT_INPUTS_VERIFIED'); }
  else if (command === 'observe' && output) { const result = await observeAll(output); console.log(JSON.stringify({ observed: result.records.length, transportFailures: result.records.filter(x => x.failure).length, qualityGraded: false })); }
  else throw new Error('Use verify, or observe FRESH_OUTPUT after parent source/control review.');
}
