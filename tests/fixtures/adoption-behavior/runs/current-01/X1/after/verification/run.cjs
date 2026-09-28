'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');

const root = path.resolve(__dirname, '..');
const features = JSON.parse(fs.readFileSync(path.join(__dirname, 'features.json'))).features;
const hash = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

// Host-neutral interface: setup, launch, doctor, drive, observe, compare, cleanup.
function setup() {
  fs.mkdirSync(path.join(__dirname, 'evidence'), { recursive: true });
  const dir = fs.mkdtempSync(path.join(__dirname, 'evidence', 'run-'));
  return { dir, startedAt: new Date().toISOString(), node: process.version,
    hashes: Object.fromEntries(['app.cjs', 'README.md', 'verification/run.cjs',
      'verification/features.json'].map(file => [file, hash(file)])),
    observations: {}, checks: [], stdout: '', stderr: '' };
}

function compare(observed, expected) {
  assert.equal(observed.status, expected.status, 'HTTP status');
  if (Object.hasOwn(expected, 'body')) assert.deepStrictEqual(observed.body, expected.body, 'JSON body');
}

async function launch(state, signal) {
  state.child = spawn(process.execPath, [path.join(root, 'app.cjs')], {
    cwd: root, env: {}, stdio: ['ignore', 'pipe', 'pipe']
  });
  state.pid = state.child.pid;
  state.closed = false;
  state.child.on('error', error => { state.launchError = error.message; });
  state.child.on('close', (code, terminationSignal) => {
    state.closed = true;
    state.exit = { code, signal: terminationSignal };
  });
  state.child.stdout.on('data', chunk => { state.stdout = (state.stdout + chunk).slice(0, 65536); });
  state.child.stderr.on('data', chunk => { state.stderr = (state.stderr + chunk).slice(0, 65536); });
  const deadline = Date.now() + 3000;
  while (!state.stdout.includes('\n')) {
    signal.throwIfAborted();
    if (state.launchError || state.closed) throw new Error(state.launchError || 'App exited before port announcement');
    if (Date.now() >= deadline) throw new Error('Port announcement timed out');
    await delay(20, undefined, { signal });
  }
  state.port = JSON.parse(state.stdout.split('\n')[0]).port;
  assert.ok(Number.isInteger(state.port) && state.port > 0 && state.port <= 65535, 'Valid announced port');
}

function drive(state, feature, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: '127.0.0.1', port: state.port,
      path: feature.path, agent: false, signal }, response => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        raw += chunk;
        if (raw.length > 65536) request.destroy(new Error('Response exceeds evidence bound'));
      });
      response.on('error', reject);
      response.on('end', () => {
        try { resolve({ method: 'GET', path: feature.path, status: response.statusCode,
          raw, body: JSON.parse(raw) }); } catch (error) { reject(error); }
      });
    });
    const deadline = setTimeout(() => request.destroy(new Error('Request timed out')), 2000);
    request.on('close', () => clearTimeout(deadline));
    request.on('error', reject);
  });
}

function observe(state, feature, observation) {
  state.observations[feature.id] = observation;
  // Retain the actual response even when comparison fails.
  fs.writeFileSync(path.join(state.dir, 'observations.json'), JSON.stringify(state.observations, null, 2) + '\n');
}

async function doctor(state, signal) {
  const feature = features.find(item => item.id === 'readiness');
  const observation = await drive(state, feature, signal);
  observe(state, feature, observation);
  compare(observation, feature.observableResult);
  state.checks.push('readiness');
}

async function cleanup(state) {
  if (state.child && !state.closed) {
    state.child.kill('SIGTERM');
    const deadline = Date.now() + 2000;
    while (!state.closed && Date.now() < deadline) await delay(20);
    if (!state.closed) {
      state.forcedCleanup = true;
      state.child.kill('SIGKILL');
      const killDeadline = Date.now() + 2000;
      while (!state.closed && Date.now() < killDeadline) await delay(20);
    }
    assert.ok(state.closed, 'Owned child stopped');
  }
  if (state.pid) {
    let exists = true;
    try { process.kill(state.pid, 0); } catch (error) {
      if (error.code !== 'ESRCH') throw error;
      exists = false;
    }
    assert.equal(exists, false, 'Owned PID no longer exists');
  }
  state.cleanup = { ownedProcessStopped: !state.child || state.closed, evidencePreserved: true };
  if (state.forcedCleanup) throw new Error('App required SIGKILL instead of documented SIGTERM shutdown');
}

async function main() {
  const state = setup();
  const controller = new AbortController();
  const interrupt = () => controller.abort(new Error('Verification interrupted'));
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', interrupt);
  const deadline = setTimeout(() => controller.abort(new Error('Verification exceeded 12 seconds')), 12000);
  let phase = 'launch';
  try {
    await launch(state, controller.signal);
    phase = 'doctor';
    await doctor(state, controller.signal);
    phase = 'comparison control';
    assert.throws(() => compare({ status: 200, body: { result: 13 } },
      { status: 200, body: { result: 12 } }), assert.AssertionError);
    state.checks.push('known-bad sum rejected');
    for (const feature of features.filter(item => item.id !== 'readiness')) {
      phase = feature.id;
      const observation = await drive(state, feature, controller.signal);
      observe(state, feature, observation);
      compare(observation, feature.observableResult);
      state.checks.push(feature.id);
    }
  } catch (error) {
    state.failure = { phase, message: error.message };
  } finally {
    clearTimeout(deadline);
    try { await cleanup(state); } catch (error) { state.cleanupFailure = error.message; }
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
    state.finishedAt = new Date().toISOString();
    state.productUnchanged = ['app.cjs', 'README.md'].every(file => state.hashes[file] === hash(file));
    state.passed = !state.failure && !state.cleanupFailure && state.productUnchanged;
    const { child, ...report } = state;
    fs.writeFileSync(path.join(state.dir, 'stdout.log'), state.stdout);
    fs.writeFileSync(path.join(state.dir, 'stderr.log'), state.stderr);
    const reportPath = path.join(state.dir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(reportPath, 'utf8')), report, 'Evidence readable after cleanup');
    console.log(JSON.stringify({ passed: state.passed, evidence: reportPath, checks: state.checks,
      cleanup: state.cleanup, failure: state.failure, cleanupFailure: state.cleanupFailure }));
    if (!state.passed) process.exitCode = 1;
  }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { setup, launch, doctor, drive, observe, compare, cleanup };
