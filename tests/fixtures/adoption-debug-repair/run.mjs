import { readFile, writeFile, mkdir, cp, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { execute } from '../../../scripts/frontend-adoption-trials.mjs';
const root = dirname(fileURLToPath(import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function tree(path, prefix = '') {
  const out = {};
  for (const entry of (await readdir(join(path, prefix), { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
    const name = join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(out, await tree(path, name));
    else if (entry.isFile()) out[name] = sha(await readFile(join(path, name)));
    else throw new Error(`Unexpected non-regular input: ${name}`);
  }
  return out;
}
const manifest = JSON.parse(await readFile(join(root, 'frozen-plan.json')));
for (const [file, expected] of Object.entries(manifest.files)) if (sha(await readFile(resolve(root, file))) !== expected) throw new Error(`Frozen input changed: ${file}`);
if (sha(await readFile(manifest.executable)) !== manifest.executableSHA256) throw new Error('Executable changed');
const directory = manifest.captureDirectory, cwd = manifest.workspace;
await mkdir(directory); // exclusive attempt marker: no retries/replacing captures
await mkdir(cwd);
await cp(join(root, 'project'), cwd, { recursive: true });
await cp(cwd, join(directory, 'before'), { recursive: true });
await writeFile(join(directory, 'input-binding.json'), JSON.stringify({ frozenPlanSHA256: sha(await readFile(join(root, 'frozen-plan.json'))), before: await tree(cwd), node: process.version, platform: process.platform, arch: process.arch }, null, 2));
const prompt = await readFile(join(root, 'prompt.txt'), 'utf8');
const telemetry = await execute({ prompt, cwd, directory, scenario: { mode: 'implementation', budget: { timeoutMs: 360000, maximumImageCalls: 0 } }, executable: manifest.executable });
await cp(cwd, join(directory, 'after'), { recursive: true });
await writeFile(join(directory, 'after-binding.json'), JSON.stringify(await tree(cwd), null, 2));
console.log(JSON.stringify({ directory, cwd, exitCode: telemetry.exitCode, completedTurn: telemetry.completedTurn, timedOut: telemetry.timedOut, responsePresent: telemetry.responsePresent, elapsedMs: telemetry.elapsedMs, processObservationComplete: telemetry.processObservation.complete, ownedResidualCount: telemetry.observedOwnedResidualProcesses.length }));
