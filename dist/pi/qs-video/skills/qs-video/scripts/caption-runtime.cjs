// Installed-runtime adapter for the private embedded-caption pipeline.
// Resolves existing resources only: no package, browser, model or skill setup.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const VERSION = '0.8.77';
const MODEL_SHA256 = '01eb6a29a5c4d8edb30b56adad9bb3a2a0535338e480724a213e0acfd2d1c73c';
let selected;
function environment() {
  return { ...process.env, HYPERFRAMES_SKIP_SKILLS: '1', HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1' };
}
function existingFile(file, label, executable = false) {
  if (!file || !path.isAbsolute(file) || !fs.existsSync(file) || !fs.statSync(file).isFile())
    throw new Error(`${label} must name an existing absolute file. No automatic download or installation.`);
  if (executable) fs.accessSync(file, fs.constants.X_OK);
  return fs.realpathSync(file);
}
function runtime(project) {
  if (project) {
    const manifest = path.join(project, 'package.json');
    if (fs.existsSync(manifest)) {
      const p = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      const pin = p.dependencies?.hyperframes ?? p.devDependencies?.hyperframes;
      if (pin && pin !== VERSION) throw new Error(`Project hyperframes pin ${pin} is unsupported; preserve it. Tested runtime: ${VERSION}.`);
    }
  }
  if (!selected) {
    const cli = existingFile(process.env.QS_VIDEO_CLI, 'QS_VIDEO_CLI', true);
    const probe = cp.spawnSync(process.execPath, [cli, '--version'], { encoding: 'utf8', env: environment(), timeout: 15000 });
    if (probe.status !== 0 || probe.stdout.trim() !== VERSION) throw new Error(`QS_VIDEO_CLI must be verified hyperframes ${VERSION}; version probe failed or mismatched.`);
    selected = { cli, require: createRequire(cli) };
  }
  return selected;
}
function dependency(name) {
  try { return runtime().require(name); }
  catch (error) { throw new Error(`Existing selected runtime dependency ${name} unavailable: ${error.message}`); }
}
function gsapSource() {
  return fs.readFileSync(runtime().require.resolve('gsap/dist/gsap.min.js'));
}
function localizeGsap(html, project) {
  runtime(project);
  const source = gsapSource();
  const name = `qs-caption-gsap.${createHash('sha256').update(source).digest('hex').slice(0, 16)}.js`;
  const target = path.join(project, name);
  if (fs.existsSync(target)) {
    if (!fs.readFileSync(target).equals(source)) throw new Error(`Existing local GSAP asset differs: ${target}`);
  } else fs.writeFileSync(target, source, { flag: 'wx' });
  const integrity = `sha384-${createHash('sha384').update(source).digest('base64')}`;
  return html.replace(/<script\b[^>]*\bsrc=["']https?:\/\/[^"']*gsap[^"']*["'][^>]*><\/script>/gi,
    `<script src="${name}" integrity="${integrity}"></script>`);
}
function browserPath() {
  return existingFile(process.env.HYPERFRAMES_BROWSER_PATH, 'HYPERFRAMES_BROWSER_PATH', true);
}
function browserOptions(options = {}) {
  // Explicit process-local opt-in for isolated containers without user namespaces.
  // Ordinary launches retain Chromium's OS sandbox; no host setting is changed.
  const extra = process.env.QS_VIDEO_BROWSER_NO_SANDBOX === '1' ? ['--no-sandbox'] : [];
  return { ...options, executablePath: browserPath(), args: [...(options.args || []), ...extra] };
}
async function preparePage(page) {
  const source = gsapSource();
  const integrity = `sha384-${createHash('sha384').update(source).digest('base64')}`;
  const { fileURLToPath } = require('node:url');
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = request.url();
    if (request.isNavigationRequest() && url.startsWith('file:')) {
      const html = fs.readFileSync(fileURLToPath(url), 'utf8').replace(/<script\b(?=[^>]*\bsrc=["'][^"']*gsap[^"']*["'])[^>]*>/gi,
        tag => tag.replace(/\s+integrity\s*=\s*(?:"[^"]*"|'[^']*')/gi, '').replace(/>$/, ` integrity="${integrity}">`));
      request.respond({ status: 200, contentType: 'text/html', body: html });
    } else if (request.resourceType() === 'script' && /gsap/i.test(url) && /^https?:/i.test(url)) {
      request.respond({ status: 200, contentType: 'application/javascript', body: source });
    } else request.continue();
  });
}
function preflightMatte(project) {
  const r = runtime(project);
  dependency('sharp');
  const model = path.join(os.homedir(), '.cache/hyperframes/background-removal/models/u2net_human_seg.onnx');
  existingFile(model, 'Cached u2net_human_seg model');
  if (createHash('sha256').update(fs.readFileSync(model)).digest('hex') !== MODEL_SHA256)
    throw new Error('Cached u2net_human_seg model digest mismatch; no implicit replacement/download.');
  // This CLI loads optional ONNX from THIS cache, not the CLI's node_modules.
  const optional = path.join(os.homedir(), '.cache/hyperframes/optional/onnxruntime-node@1.21.1');
  const manifest = path.join(optional, 'node_modules/onnxruntime-node/package.json');
  existingFile(manifest, 'Cached optional onnxruntime-node@1.21.1 manifest');
  if (JSON.parse(fs.readFileSync(manifest, 'utf8')).version !== '1.21.1') throw new Error('Cached optional ONNX version mismatch.');
  const ort = createRequire(path.join(optional, 'package.json'))('onnxruntime-node');
  if (typeof ort.InferenceSession?.create !== 'function') throw new Error('Cached optional ONNX native runtime cannot load.');
  return { cli: r.cli, model, optional, modelSha256: MODEL_SHA256 };
}
async function runCli(args, { cwd, timeoutMs = 600000 } = {}) {
  const { cli } = runtime(cwd);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid CLI timeout');
  // Own a process group so a timeout cannot kill another render's Chromium.
  return new Promise((resolve, reject) => {
    const child = cp.spawn(process.execPath, [cli, ...args], { cwd, env: environment(), stdio: 'inherit', detached: process.platform !== 'win32' });
    let timedOut = false;
    const kill = () => { try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGKILL'); } catch {} };
    const timer = setTimeout(() => { timedOut = true; kill(); }, timeoutMs);
    const cancel = () => { timedOut = true; kill(); };
    process.once('SIGTERM', cancel); process.once('SIGINT', cancel);
    const clean = () => { clearTimeout(timer); process.removeListener('SIGTERM', cancel); process.removeListener('SIGINT', cancel); };
    child.once('error', error => { clean(); reject(error); });
    child.once('close', code => {
      clean(); kill();
      if (timedOut || code !== 0) reject(new Error(`CLI ${args[0]} ${timedOut ? 'timed out/cancelled' : `failed (${code})`}; output existence is not success.`));
      else resolve();
    });
  });
}
module.exports = { runtime, dependency, gsapSource, localizeGsap, browserOptions, browserPath, preflightMatte, preparePage, runCli };
if (require.main === module) (async () => {
  const [operation, project, fps, output, format] = process.argv.slice(2);
  if (operation === 'preflight-matte') console.log(JSON.stringify(preflightMatte(project)));
  else if (operation === 'preflight-render') { runtime(project); dependency('sharp'); dependency('puppeteer-core'); gsapSource(); browserPath(); }
  else if (operation === 'render') {
    runtime(project); browserPath();
    await runCli(['render', '--skill=embedded-captions', '--dir', project, '--fps', fps, ...(format ? ['--format', format] : []), '--crf', '11', '-o', output], { cwd: project, timeoutMs: Number(process.env.HF_TIMEOUT_S || 600) * 1000 });
  } else throw new Error('Expected preflight-matte, preflight-render or render');
})().catch(error => { console.error(`[caption-runtime] ${error.message}`); process.exitCode = 3; });
