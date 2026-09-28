// Append-only pilot recovery interface. The original runner, plan and failed pilot stay immutable.
import { readFile, writeFile, mkdir, mkdtemp, cp, access, realpath } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { constants } from 'node:fs';
import { join, resolve, delimiter } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fixtureRoot, sha, verify, manifest, buildPrompt, execute, reviewerBundle } from '../../../scripts/frontend-adoption-trials.mjs';

const amendmentPath = join(fixtureRoot, 'infrastructure-amendment.json');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const writeJson = async (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });

export async function existingCli() {
  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    if (!directory) continue;
    const path = join(directory, 'codex');
    try { await access(path, constants.X_OK); const resolved = await realpath(path); return { path: resolved, sha256: sha(await readFile(resolved)) }; } catch {}
  }
  throw new Error('Existing Codex CLI not found. No installation is authorized.');
}

export async function verifyAmendment() {
  const amendment = await readJson(amendmentPath), snapshot = await verify();
  if (sha(await readFile(fileURLToPath(import.meta.url))) !== amendment.interfaceSHA256) throw new Error('Amendment interface changed.');
  if (sha(await readFile(join(fixtureRoot, 'plan.json'))) !== amendment.originalPlanSHA256) throw new Error('Original plan changed.');
  if (sha(await readFile(join(fixtureRoot, 'pilot-attempt.json'))) !== amendment.originalAttemptMarkerSHA256) throw new Error('Original attempt marker changed.');
  if (JSON.stringify(await manifest(amendment.failedPilotDirectory)) !== JSON.stringify(amendment.failedPilotManifest)) throw new Error('Original failed pilot evidence changed.');
  if (sha(await readFile(amendment.failedSupervisorLog.path)) !== amendment.failedSupervisorLog.sha256) throw new Error('Original supervisor log changed.');
  if (JSON.stringify(await existingCli()) !== JSON.stringify(amendment.existingCli)) throw new Error('Existing CLI identity changed.');
  const cli = spawnSync(amendment.existingCli.path, ['--version'], { encoding: 'utf8' });
  const config = spawnSync('python3', ['-c', 'import os,json,tomllib,pathlib; p=pathlib.Path(os.environ.get("CODEX_HOME",str(pathlib.Path.home()/".codex")))/"config.toml"; d=tomllib.loads(p.read_text()) if p.exists() else {}; print(json.dumps({k:d.get(k) for k in ["model","model_reasoning_effort","sandbox_mode","approval_policy"]}))'], { encoding: 'utf8' });
  if (cli.status !== 0 || cli.stdout.trim() !== snapshot.plan.host.cliVersion || config.status !== 0 || JSON.stringify(JSON.parse(config.stdout)) !== JSON.stringify(snapshot.plan.host.configured)) throw new Error('Original default CLI/model/reasoning/sandbox/approval settings changed.');
  if (snapshot.plan.host.node !== process.version || snapshot.plan.host.platform !== process.platform) throw new Error('Host runtime changed.');
  if (amendment.maximumCorrectedAttempts !== 1 || amendment.scenarioId !== 'F10' || amendment.variant !== 'v84') throw new Error('Amendment exceeds the bounded parent authorization.');
  return { amendment, snapshot };
}

export async function correctedPilot({ output, parentDeclaredRuntimeWriteInterface = false }) {
  if (!parentDeclaredRuntimeWriteInterface) throw new Error('Parent must launch via exec_command require_escalated and declare --parent-approved-runtime-write.');
  const { amendment, snapshot } = await verifyAmendment();
  if (!output || !resolve(output).startsWith('/tmp/')) throw new Error('An isolated /tmp output directory is required.');
  output = resolve(output);
  // Exclusive append-only marker: never remove the failed attempt or reset either budget.
  await writeJson(join(fixtureRoot, 'corrected-pilot-attempt.json'), { output, startedAt: new Date().toISOString(), amendmentSHA256: sha(await readFile(amendmentPath)),
    expectedExecutionInterface: 'Parent exec_command require_escalated; operator declaration, not introspected sandbox telemetry.', scenarioId: 'F10', variant: 'v84' });
  await mkdir(output);
  const directory = join(output, 'corrected-pilot-F10-v84'); await mkdir(directory);
  const cwd = await mkdtemp(join(tmpdir(), 'qs-frontend-corrected-pilot-'));
  const scenario = snapshot.cases.find(c => c.id === 'F10'), run = { trialId: 'corrected-pilot-F10-v84', scenarioId: 'F10', variant: 'v84', repetition: null };
  await cp(join(fixtureRoot, 'assets', scenario.projectFixture), cwd, { recursive: true });
  await cp(cwd, join(directory, 'before'), { recursive: true });
  const before = await manifest(cwd);
  const input = await buildPrompt({ root: fixtureRoot, sources: snapshot.sources, common: snapshot.common, scenario, variant: 'v84', cwd, browserPaths: null });
  await writeJson(join(directory, 'binding.json'), { run, cwd, configuredHost: snapshot.plan.host, originalPlanSHA256: amendment.originalPlanSHA256,
    amendmentSHA256: sha(await readFile(amendmentPath)), instructions: input.instructions, loadedInstructionUtf8Bytes: input.instructions.reduce((n, i) => n + i.bytes, 0),
    commonScopeSHA256: input.commonScopeSHA256, comparisonExcluded: true });
  let interrupted = false;
  const stop = () => {
    interrupted = true;
    try {
      const child = JSON.parse(readFileSync(join(directory, 'process.json'), 'utf8'));
      const identity = readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() + ':' + readFileSync(`/proc/${child.pid}/stat`, 'utf8').split(') ')[1].split(' ')[19];
      if (child.identity === identity) process.kill(-child.pid, 'SIGTERM');
    } catch {}
  };
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop);
  const stopTimer = setInterval(() => { if (interrupted) stop(); }, 100);
  try {
    const telemetry = await execute({ ...input, cwd, directory, scenario, executable: amendment.existingCli.path, referenceImage: null });
    const after = await manifest(cwd); await cp(cwd, join(directory, 'after'), { recursive: true });
    await reviewerBundle({ root: fixtureRoot, directory, scenario, common: snapshot.common, before, after, trialId: run.trialId, telemetry, browserStatus: 'not-applicable' });
    const failure = telemetry.exitCode !== 0 || !telemetry.completedTurn || !telemetry.responsePresent || telemetry.timedOut || telemetry.stopReason || telemetry.malformedLines || telemetry.observedOwnedResidualProcesses.length || interrupted || JSON.stringify(before) !== JSON.stringify(after);
    const summary = { run, cwd, comparisonExcluded: true, failure: Boolean(failure), before, after, interrupted,
      classification: 'One corrected infrastructure pilot. Independent semantic review pending; no rendered or image quality claim.',
      originalFailedPilotRetained: amendment.failedPilotDirectory, amendmentSHA256: sha(await readFile(amendmentPath)) };
    await writeJson(join(directory, 'summary.json'), summary);
    return { directory, failure: Boolean(failure), independentReview: 'pending' };
  } finally { clearInterval(stopTimer); for (const signal of ['SIGINT', 'SIGTERM']) process.off(signal, stop); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, output, declaration] = process.argv.slice(2);
  try {
    if (command === 'verify') { const { amendment } = await verifyAmendment(); console.log(JSON.stringify({ verified: true, amendment }, null, 2)); }
    else if (command === 'pilot') { const result = await correctedPilot({ output, parentDeclaredRuntimeWriteInterface: declaration === '--parent-approved-runtime-write' }); console.log(JSON.stringify(result, null, 2)); if (result.failure) process.exitCode = 1; }
    else throw new Error('Use verify, or pilot OUTPUT --parent-approved-runtime-write.');
  } catch (e) { console.error(e.stack); process.exitCode = 1; }
}
