const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');

const root = path.resolve(__dirname, '..');
const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
const evidencePath = path.join(__dirname, 'evidence', `${runId}.json`);
const report = { runId, node: process.version, hashes: {}, doctors: [], sessions: [], features: [] };
let session;
let interrupted = false;
let features = {};

function doctor(reason) {
  const checks = ['app.cjs', 'verification/run.cjs'].map(file => {
    const result = cp.spawnSync(process.execPath, ['--check', path.join(root, file)], { timeout: 3000 });
    return { file, passed: result.status === 0 };
  });
  const result = { reason, checks, passed: typeof fetch === 'function' && checks.every(c => c.passed) };
  report.doctors.push(result);
  return result.passed;
}

async function request(route) {
  try {
    const response = await fetch(`http://127.0.0.1:${session.port}${route}`, {
      signal: AbortSignal.timeout(1500), redirect: 'manual'
    });
    const body = await response.text();
    let json;
    try { json = JSON.parse(body); } catch {}
    return { route, status: response.status, body, json,
      contentType: response.headers.get('content-type'),
      contentDisposition: response.headers.get('content-disposition') };
  } catch (error) { return { route, error: error.message }; }
}

async function readiness(reason) {
  const response = await request('/health');
  const passed = response.status === 200 && response.json?.ready === true;
  report.doctors.push({ reason, response, passed });
  return passed;
}

async function stop() {
  if (!session) return;
  const owned = session;
  const wait = async ms => {
    let timer;
    try {
      return await Promise.race([owned.closed.then(() => true),
        new Promise(resolve => { timer = setTimeout(() => resolve(false), ms); })]);
    } finally { clearTimeout(timer); }
  };
  if (!owned.exited) owned.child.kill('SIGTERM');
  if (!await wait(1500)) {
    owned.record.forcedKill = true;
    owned.child.kill('SIGKILL');
    if (!await wait(1500)) throw new Error(`Owned process ${owned.child.pid} did not close`);
  }
  owned.record.cleanupConfirmed = true;
  session = undefined;
}

async function start() {
  if (interrupted) throw new Error('Run interrupted');
  if (!doctor('before session')) throw new Error('Static doctor failed');
  const child = cp.spawn(process.execPath, [path.join(root, 'app.cjs')], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe']
  });
  const record = { pid: child.pid, stderr: '', cleanupConfirmed: false };
  report.sessions.push(record);
  const owned = { child, record, exited: false };
  session = owned;
  owned.closed = new Promise(resolve => child.once('close', (code, signal) => {
    owned.exited = true;
    record.exit = { code, signal };
    resolve();
  }));
  child.stderr.on('data', data => { record.stderr = (record.stderr + data).slice(-4096); });
  const lines = readline.createInterface({ input: child.stdout });
  try {
    owned.port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('Port announcement timed out')), 2000);
      function finish(error, port) {
        clearTimeout(timer);
        lines.off('line', onLine);
        child.off('error', onError);
        child.off('exit', onExit);
        if (error) reject(error); else resolve(port);
      }
      function onError(error) { finish(error); }
      function onExit() { finish(new Error('App exited before announcing a port')); }
      function onLine(line) {
        try {
          const { port } = JSON.parse(line);
          if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
          finish(null, port);
        } catch (error) { finish(error); }
      }
      lines.on('line', onLine);
      child.once('error', onError);
      child.once('exit', onExit);
    });
  } finally { lines.close(); }
  record.port = owned.port;
  if (!await readiness('new session readiness')) throw new Error('GET /health did not return {ready:true}');
}

function check(name, feature, response) {
  if (name === 'sum') return response.status === 200 && response.json?.result === feature.expected;
  if (name === 'export') return response.status === 200 &&
    /^attachment(?:;|$)/i.test(response.contentDisposition || '') && response.body.length > 0;
  return false;
}

async function main() {
  for (const file of ['README.md', 'app.cjs', 'verification/features.json', 'verification/run.cjs']) {
    report.hashes[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
  }
  features = JSON.parse(fs.readFileSync(path.join(__dirname, 'features.json'), 'utf8'));
  // Guard the documented contract independently of product implementation.
  if (features.sum?.action !== 'GET /sum?a=7&b=5' || features.sum.expected !== 12 ||
      features.export?.action !== 'GET /export' || features.export.expected !== 'download') {
    throw new Error('Feature map must retain documented sum=12 and export=download expectations');
  }
  if (process.argv.includes('--doctor')) {
    if (!doctor('doctor command')) throw new Error('Static doctor failed');
    report.mode = 'doctor';
    return;
  }
  let unavailable;
  try { await start(); } catch (error) {
    unavailable = error.message;
    doctor('after startup failure');
    await stop();
  }
  for (const [name, feature] of Object.entries(features)) {
    if (unavailable || interrupted) {
      report.features.push({ name, ...feature, status: 'unreachable',
        prerequisite: unavailable || 'Run interrupted', attemptedRoute: feature.action });
      continue;
    }
    const route = feature.action.startsWith('GET /') ? feature.action.slice(4) : null;
    if (!route || !['sum', 'export'].includes(name)) {
      report.features.push({ name, ...feature, status: 'failed', classification: 'harness',
        reason: 'Mapped feature has no supported driver/check', attemptedRoute: feature.action });
      doctor(`after unsupported feature ${name}`);
      continue;
    }
    const response = await request(route);
    const passed = check(name, feature, response);
    report.features.push({ name, ...feature, response, status: passed ? 'passed' : 'failed',
      classification: passed ? undefined : 'product',
      reason: passed ? undefined : name === 'sum' ? 'Expected JSON result 12' :
        'Expected a nonempty attachment download; documented 404 remains a product gap' });
    if (!passed) {
      doctor(`after ${name} failure`);
      if (!await readiness(`after ${name} failure readiness`)) {
        await stop();
        try { await start(); } catch (error) {
          unavailable = error.message;
          doctor('after relaunch failure');
          await stop();
        }
      }
    }
  }
}

function interrupt() {
  interrupted = true;
  if (session && !session.exited) session.child.kill('SIGTERM');
}
process.on('SIGINT', interrupt);
process.on('SIGTERM', interrupt);

(async () => {
  try { await main(); } catch (error) {
    report.error = error.message;
    doctor('after unexpected failure');
    for (const [name, feature] of Object.entries(features)) {
      if (!report.features.some(entry => entry.name === name)) {
        report.features.push({ name, ...feature, status: 'unreachable',
          attemptedRoute: feature.action, prerequisite: error.message });
      }
    }
  } finally {
    try { await stop(); } catch (error) { report.cleanupError = error.message; }
    report.passed = !interrupted && !report.error && !report.cleanupError &&
      report.doctors.every(entry => entry.passed) && report.features.every(entry => entry.status === 'passed');
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    const saved = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    console.log(JSON.stringify({ passed: saved.passed, features: saved.features, evidence: evidencePath,
      cleanupConfirmed: saved.sessions.every(entry => entry.cleanupConfirmed) }, null, 2));
    process.exitCode = report.passed ? 0 : 1;
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', interrupt);
  }
})();
