import { readFileSync, mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile = JSON.parse(readFileSync(join(workspace, 'tools/runtime-profile.json')));
for (const item of Object.values(profile.files)) if (createHash('sha256').update(readFileSync(item.path)).digest('hex') !== item.sha256) throw new Error('Bound runtime changed');
const action = process.argv[2];
if (!['version', 'check', 'render', 'inspect'].includes(action) || process.argv.length !== 3) throw new Error('Use one documented operation');
const out = join(workspace, 'output'), user = join(out, 'user'); mkdirSync(user, { recursive: true });
const env = { ...process.env, NODE_OPTIONS: '--import=' + join(workspace, 'tools/offline.mjs'),
 HF_TEST_USER_DIRECTORY: user, HF_TEST_NETWORK_LOG: join(out, 'network.jsonl'),
 HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1', HYPERFRAMES_SKIP_SKILLS: '1',
 HYPERFRAMES_BROWSER_PATH: profile.files.browser.path, HYPERFRAMES_FFMPEG_PATH: profile.files.ffmpeg.path,
 HYPERFRAMES_FFPROBE_PATH: profile.files.ffprobe.path, XDG_CACHE_HOME: join(out,'cache'),
 LD_LIBRARY_PATH: profile.libraryPath, PATH: dirname(profile.files.ffmpeg.path) + ':' + process.env.PATH };
function run(executable, args, label) {
 const result = spawnSync(executable, args, { cwd: join(workspace, 'composition'), env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
 appendFileSync(join(out, 'commands.jsonl'), JSON.stringify({ label, executable, args, status: result.status, signal: result.signal, error: result.error?.message })+'\n');
 writeFileSync(join(out, label+'.stdout'), result.stdout ?? ''); writeFileSync(join(out,label+'.stderr'), result.stderr ?? '');
 process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
 if (result.status !== 0) process.exit(result.status || 1);
}
const cli=profile.files.cli.path;
if (action==='version') run(cli,['--version'],'version');
if (action==='check') run(cli,['check','.','--json','--at=1'],'check');
if (action==='render') run(cli,['render','.','--fps','12','--quality','draft','--workers','1','--no-browser-gpu','--output',join(out,'render.mp4')],'render');
if (action==='inspect') {
 run(profile.files.ffprobe.path,['-v','error','-show_streams','-show_format','-of','json',join(out,'render.mp4')],'metadata');
 for (const time of ['0.25','1','1.75']) run(profile.files.ffmpeg.path,['-v','error','-y','-ss',time,'-i',join(out,'render.mp4'),'-frames:v','1',join(out,'frame-'+time+'.png')],'frame-'+time);
}
