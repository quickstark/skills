// Explicit, sequential live-model capture; never run by npm test.
import { readFile, writeFile, mkdir, mkdtemp, readdir, lstat, readlink, symlink, cp } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execute, sha } from './frontend-adoption-trials.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = join(root, 'tests/fixtures/repo-cleanup');
export async function snapshot(directory) {
  const result = {};
  async function walk(path, prefix = '') {
    for (const name of (await readdir(path)).sort()) {
      const full = join(path, name), key = prefix + name, stat = await lstat(full);
      if (stat.isSymbolicLink()) result[key] = { link: await readlink(full) };
      else if (stat.isDirectory()) await walk(full, key + '/');
      else result[key] = { sha256: sha(await readFile(full)), bytes: stat.size };
    }
  }
  await walk(directory); return result;
}
const json = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });

export async function capture(output, only) {
  if (!/^\/tmp\/qs-repo-cleanup-[a-z0-9-]+$/.test(output)) throw Error('A fresh /tmp/qs-repo-cleanup-* output is required.');
  const scenariosText = await readFile(join(fixtures, 'scenarios.json'), 'utf8');
  const cases = JSON.parse(scenariosText).filter(c => !only || c.id === only);
  if (!cases.length) throw Error('No matching trial');
  const source = await readFile(join(root, 'skills/engineering/qs-repo-cleanup/SKILL.md'), 'utf8');
  await mkdir(output);
  await json(join(output, 'binding.json'), { sourceSHA256: sha(source), scenariosSHA256: sha(scenariosText), runnerSHA256: sha(await readFile(fileURLToPath(import.meta.url))), supervisorSHA256: sha(await readFile(join(root, 'scripts/frontend-adoption-trials.mjs'))), startedAt: new Date().toISOString(), modelOverrides: [], selection: only ?? 'all', evidenceScope: 'Fresh single-sample synthetic-fixture trials; no universal reliability or performance claim. Git observations are simulated, filesystem changes are real. No installation, commits, or publication.' });
  await writeFile(join(output, 'SKILL.md'), source);
  await writeFile(join(output, 'scenarios.json'), scenariosText);
  await cp(fileURLToPath(import.meta.url), join(output, 'runner.mjs'));
  const results = [];
  for (const c of cases) {
    const directory = join(output, c.id); await mkdir(directory);
    const cwd = await mkdtemp('/tmp/qs-cleanup-fixture-');
    for (const [path, content] of Object.entries(c.files ?? {})) {
      if (path.startsWith('/') || path.split('/').includes('..')) throw Error('Unsafe fixture path');
      await mkdir(dirname(join(cwd, path)), { recursive: true }); await writeFile(join(cwd, path), content);
    }
    const outside = await mkdtemp('/tmp/qs-cleanup-outside-');
    await writeFile(join(outside, 'sentinel.txt'), 'OUTSIDE_MUST_SURVIVE\n');
    if (c.externalLink) await symlink(outside, join(cwd, 'external'));
    const before = await snapshot(cwd), outsideBefore = await snapshot(outside);
    await cp(cwd, join(directory, 'before'), { recursive: true, verbatimSymlinks: true });
    const prompt = [
      'This is a bounded behavioral acceptance trial of the supplied skill, not delegation of repository implementation. Use the exact supplied skill as task guidance. No other skills, agents, goals, external services, installation, commits, publication, or changes to model/reasoning/approval/sandbox settings. Do not inspect credentials or configuration outside the fixture. Use /bin/sh with login=false for shell calls if needed.',
      `Workspace: ${cwd}. This is a synthetic repository export. Git state/revision facts supplied below are authoritative simulated observations; no real Git commit is claimed. Do not initialize Git or run git commands. File content is real and recoverable from the immutable baseline supplied to this trial. Never edit the harness instructions or verification scripts.`,
      c.mode === 'response-only' ? 'Closed response-only trial. Do not use tools or mutate files. For each named scenario, give concrete immediate actions or retained paths and the result status, without claiming actions were executed.' : 'Inspect actual fixture files and perform authorized hygiene using local tools. Preserve unrelated files. Run available checks. Do not leave processes running. All facts in the request describe this fixture, not external systems.',
      '<skill>', source, '</skill>', '<request>', c.request, '</request>',
    ].join('\n\n');
    console.log(JSON.stringify({ state: 'started', id: c.id }));
    const telemetry = await execute({ prompt, cwd, directory, executable: 'codex', scenario: { mode: c.mode === 'response-only' ? 'prompt-only' : 'implementation', budget: { timeoutMs: 180000, maximumImageCalls: 0 } } });
    const after = await snapshot(cwd), outsideAfter = await snapshot(outside);
    await cp(cwd, join(directory, 'after'), { recursive: true, verbatimSymlinks: true });
    await json(join(directory, 'state.json'), { id: c.id, acceptance: c.acceptance, mode: c.mode, before, after, outsideBefore, outsideAfter, sourceSHA256: sha(source), fixtureSHA256: sha(JSON.stringify(c)), transportPassed: telemetry.exitCode === 0 && telemetry.completedTurn && telemetry.responsePresent && !telemetry.stopReason && !telemetry.timedOut, review: 'Pending parent review of actual actions and response; transport success is not behavioral acceptance.' });
    results.push({ id: c.id, transportPassed: telemetry.exitCode === 0 && telemetry.completedTurn && telemetry.responsePresent && !telemetry.stopReason && !telemetry.timedOut });
    console.log(JSON.stringify({ state: 'recorded', id: c.id, exitCode: telemetry.exitCode, completedTurn: telemetry.completedTurn, toolCount: telemetry.toolCount, timedOut: telemetry.timedOut }));
  }
  await json(join(output, 'summary.json'), { cases: results, behavioralVerdict: 'Requires independent action and state review' });
  if (results.some(result => !result.transportPassed)) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [op, output, only] = process.argv.slice(2);
  if (op !== 'capture') throw Error('Usage: node scripts/repo-cleanup-trials.mjs capture /tmp/qs-repo-cleanup-<run> [case]');
  await capture(output, only);
}
