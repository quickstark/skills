import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshot, sha } from './observer.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const frozen = resolve(here, '../frontend-adoption-v2-http');
const original = JSON.parse(await readFile(join(frozen, 'plan.json')));
if (process.version !== original.runtime.node) throw new Error('Original Node runtime changed.');
for (const [file, hash] of Object.entries(original.files)) if (sha(await readFile(resolve(frozen, file))) !== hash) throw new Error('Original frozen dependency changed: ' + file);
for (const [file, hash] of [[original.runtime.browserPath, original.runtime.browserSHA256], [original.runtime.puppeteerPath, original.runtime.puppeteerSHA256]]) if (sha(await readFile(file)) !== hash) throw new Error('Runtime identity changed.');
const ids = ['review-25dc4ed5efe9a83e', 'review-5195ebed3b164b40', 'review-51c66d979e683e0b', 'review-cb3fab72962e7198', 'review-da56342ed230466a', 'review-eb166244f5a4a48f'];
const root = '/tmp/qs-frontend-comparison-v3-native-20260926/reviewer-bundles';
const bundles = [];
for (const reviewId of ids) {
  const context = join(root, reviewId, 'context.json'), bytes = await readFile(context), parsed = JSON.parse(bytes), project = join(root, reviewId, 'actual-artifacts');
  if (parsed.task.id !== 'F11') throw new Error('Wrong scenario.');
  bundles.push({ reviewId, context, contextSha256: sha(bytes), project, manifest: (await snapshot(project)).manifest });
}
const names = ['observer.mjs', 'browser-observe-http.mjs', 'membership-observe.mjs', 'observer.test.mjs', 'observe-all.mjs', 'freeze.mjs', 'README.md', 'initial-control-failure.json', 'control-test-results.txt', '../frontend-adoption-v2-http/observer.mjs', '../frontend-adoption-v2-http/browser-observe-http.mjs', '../frontend-adoption-v2-http/plan.json'];
const files = Object.fromEntries(await Promise.all(names.map(async file => [file, sha(await readFile(resolve(here, file)))])));
const plan = { schemaVersion: 1, kind: 'uniform F11 native-dialog-aware supplementary observation; no original replacement', files, runtime: original.runtime, bundles, authority: { preparationOnly: true, actualObservation: 'Parent-owned after source/control review; no F11 rendering performed during preparation.', generation: false, productEdits: false, qualityGrading: false }, derivation: 'observer.mjs transport byte-identical to frozen HTTP module. Browser launch/confinement, wide/narrow base measurements,14-tab trace and reduced-motion measurements retained. Replace hidden-email assumption with per-viewport keyboard opener, actual submit, invalid/valid/status/events, Escape/focus observations. Never force showModal/requestSubmit or mutate product DOM.', limitations: ['48 Tab limit per target; inaccessible or broken opener remains explicit failure.', 'Native Chromium may expose BODY when focus moves through browser chrome; preserve raw sequence/documentHasFocus, not a trap-quality grade.', 'Runtime binary and Puppeteer entry bound as in original; transitive installation assumed unchanged.', 'Original native capture/HTTP failures and all product bytes stay immutable; supplement cannot change model/tool counts or earlier grades.'] };
await writeFile(join(here, 'plan.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
console.log(sha(await readFile(join(here, 'plan.json'))));
