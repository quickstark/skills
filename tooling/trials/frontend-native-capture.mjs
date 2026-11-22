import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { resolve, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StringDecoder } from 'node:string_decoder';
import { sha, createBoundedSampler, scopedProcessReader, discoverOwnedProcesses, cleanupObservedProcesses } from './frontend-adoption-trials.mjs';

const runnerPath = fileURLToPath(import.meta.url);
const json = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const nonTools = new Set(['userMessage', 'agentMessage', 'reasoning', 'plan', 'contextCompaction', 'enteredReviewMode', 'exitedReviewMode']);
const knownTools = new Set(['commandExecution', 'fileChange', 'mcpToolCall', 'dynamicToolCall', 'functionCallOutput', 'collabAgentToolCall', 'webSearch', 'imageView', 'imageGeneration', 'sleep']);
const unsupportedItems = { hookPrompt: 'hook instruction authority is unverified', subAgentActivity: 'delegated authority and process coverage are unverified' };
const names = { agentMessage: 'agent_message', commandExecution: 'command_execution', fileChange: 'file_change', mcpToolCall: 'mcp_tool_call', dynamicToolCall: 'dynamic_tool_call', functionCallOutput: 'function_call_output', imageView: 'image_view', collabAgentToolCall: 'collab_tool_call', webSearch: 'web_search' };
const usageFields = usage => usage ? { input_tokens: usage.inputTokens, cached_input_tokens: usage.cachedInputTokens,
  cache_write_input_tokens: usage.cacheWriteInputTokens ?? 0,
  output_tokens: usage.outputTokens, reasoning_output_tokens: usage.reasoningOutputTokens, total_tokens: usage.totalTokens } : null;

export function readNativeControls() {
  const r = spawnSync('python3', ['-c', 'import os,json,tomllib,pathlib; p=pathlib.Path(os.environ.get("CODEX_HOME",str(pathlib.Path.home()/".codex")))/"config.toml"; d=tomllib.loads(p.read_text()); print(json.dumps({k:d.get(k) for k in ["model","model_reasoning_effort","sandbox_mode","approval_policy","approvals_reviewer"]}))'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('Cannot read selected configured controls; raw configuration diagnostics withheld.');
  const controls = JSON.parse(r.stdout);
  if (Object.values(controls).some(v => typeof v !== 'string' || !v)) throw new Error('Explicit selected host controls are required for this comparison.');
  return controls;
}

export function validateNativeControls(expected, response, cwd) {
  const actual = { model: response.model, model_reasoning_effort: response.reasoningEffort,
    sandbox_mode: ({ workspaceWrite: 'workspace-write', readOnly: 'read-only', dangerFullAccess: 'danger-full-access' })[response.sandbox?.type], approval_policy: response.approvalPolicy,
    approvals_reviewer: response.approvalsReviewer };
  for (const k of Object.keys(expected)) if (actual[k] !== expected[k]) throw new Error(`Effective native control mismatch: ${k}`);
  if (resolve(response.cwd) !== resolve(cwd)) throw new Error('Effective native workspace mismatch.');
  if (!response.thread?.id) throw new Error('Native thread id missing.');
  return actual;
}

// Every protocol message is retained separately. This adapter adds compatibility fields;
// it never uses absence from a narrow serializer to prove absence of a tool call.
export class NativeTranscript {
  constructor({ emit, fail, scenario }) {
    Object.assign(this, { emit, fail, scenario });
    this.tools = new Map(); this.items = new Map(); this.open = new Set(); this.output = new Map(); this.text = new Map();
    this.unknownItems = []; this.unknownMethods = []; this.usage = null; this.terminal = null; this.threadId = null; this.turnId = null;
  }
  accept(message) {
    const { method, params: p = {} } = message;
    if (!method) return;
    if (p.threadId && this.threadId && p.threadId !== this.threadId) return this.fail('Unexpected thread notification; scope is not established.');
    if (p.turnId && this.turnId && p.turnId !== this.turnId) return this.fail('Unexpected turn notification; scope is not established.');
    if (method === 'thread/started') return this.emit({ type: 'thread.started', thread_id: p.thread?.id, native: p });
    if (method === 'turn/started') {
      if (this.turnId && this.turnId !== p.turn?.id) return this.fail('Unexpected additional turn.');
      this.turnId = p.turn?.id; return this.emit({ type: 'turn.started', native: p });
    }
    if (method === 'thread/tokenUsage/updated') { this.usage = p.tokenUsage; return this.emit({ type: 'usage.updated', native: p }); }
    if (method === 'item/commandExecution/outputDelta') {
      if (typeof p.itemId !== 'string' || typeof p.delta !== 'string') return this.fail('Invalid native command delta.');
      this.output.set(p.itemId, (this.output.get(p.itemId) ?? '') + p.delta);
      return this.emit({ type: 'command.output_delta', item_id: p.itemId, delta: p.delta, native: p });
    }
    if (method === 'item/agentMessage/delta') {
      if (typeof p.itemId !== 'string' || typeof p.delta !== 'string') return this.fail('Invalid native agent delta.');
      this.text.set(p.itemId, (this.text.get(p.itemId) ?? '') + p.delta);
      return this.emit({ type: 'agent_message.delta', item_id: p.itemId, delta: p.delta, native: p });
    }
    if (method === 'item/started' || method === 'item/completed') {
      const item = p.item;
      if (!item || typeof item.id !== 'string' || typeof item.type !== 'string') return this.fail('Malformed native item.');
      const completed = method === 'item/completed';
      if (completed) this.open.delete(item.id); else this.open.add(item.id);
      const normalized = { ...item, type: names[item.type] ?? item.type, native_type: item.type };
      if (item.type === 'commandExecution') {
        normalized.aggregated_output = item.aggregatedOutput ?? this.output.get(item.id) ?? '';
        normalized.exit_code = item.exitCode ?? null;
      }
      if (item.type === 'agentMessage') normalized.text = item.text ?? this.text.get(item.id) ?? '';
      this.items.set(item.id, { ...normalized, completed });
      this.emit({ type: completed ? 'item.completed' : 'item.started', item: normalized, native: p });
      if (!nonTools.has(item.type)) {
        this.tools.set(item.id, normalized);
        if (!knownTools.has(item.type)) {
          this.unknownItems.push(item.id);
          this.fail(unsupportedItems[item.type] ? `Unsupported native item: ${item.type}; ${unsupportedItems[item.type]}` : `Unknown native item semantics: ${item.type}`);
        }
        if (this.scenario.mode === 'prompt-only') this.fail('Tool event observed in response-only task');
        if (this.imageCalls() > this.scenario.budget.maximumImageCalls) this.fail('Observed image calls exceed budget');
      }
      return;
    }
    if (method === 'turn/completed') {
      // Full native terminal items can reconcile a completion whose earlier event was lost;
      // missing terminal items never manufacture completion of an open tool.
      for (const item of p.turn?.items ?? []) if (!this.items.get(item.id)?.completed) this.accept({ method: 'item/completed', params: { threadId: p.threadId, item } });
      this.terminal = p.turn;
      if (!p.turn?.id || (this.turnId && p.turn.id !== this.turnId)) this.fail('Invalid terminal turn identity.');
      if (p.turn?.status !== 'completed') this.fail(`Native turn ended ${p.turn?.status ?? 'without status'}`);
      if (this.open.size) this.fail('Terminal notification leaves incomplete items.');
      this.emit({ type: p.turn?.status === 'completed' ? 'turn.completed' : 'turn.failed', usage: usageFields(this.usage?.total), native: p });
      return;
    }
    if (method === 'model/rerouted' || method === 'thread/modelRerouted') this.fail('Model rerouted during capture.');
    if (method === 'error') this.fail('Native protocol error notification.');
    if (method.startsWith('item/') && !/^item\/(reasoning\/|plan\/|autoApprovalReview\/(started|completed)$|fileChange\/(outputDelta|patchUpdated)$|commandExecution\/terminalInteraction$|mcpToolCall\/progress$)/.test(method)) {
      this.unknownMethods.push(method); this.fail(`Unclassified native item notification: ${method}`);
    }
    this.emit({ type: 'native.notification', method, native: p });
  }
  imageCalls() { return [...this.tools.values()].filter(i => i.type === 'imageGeneration' || /image.?gen/i.test(`${i.tool ?? ''} ${i.name ?? ''} ${i.namespace ?? ''}`)).length; }
  response() { return [...this.items.values()].filter(i => i.completed && i.type === 'agent_message').map(i => i.text).join('\n\n'); }
}

function identity(pid) {
  try { const raw = readFileSync(`/proc/${pid}/stat`, 'utf8'); return readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() + ':' + raw.slice(raw.lastIndexOf(')') + 2).split(' ')[19]; } catch { return null; }
}

async function captureNative({ prompt, cwd, directory, scenario, executable, referenceImage, expectedControls: frozenControls }, readinessOnly = false) {
  if (!Number.isFinite(scenario.budget.timeoutMs) || scenario.budget.timeoutMs <= 0 || !Number.isInteger(scenario.budget.maximumImageCalls) || scenario.budget.maximumImageCalls < 0) throw new Error('Invalid bounded native capture budget.');
  const expectedControls = readNativeControls();
  if (frozenControls) for (const key of Object.keys(expectedControls)) if (frozenControls[key] !== expectedControls[key]) throw new Error(`Configured native control changed since freeze: ${key}`);
  const args = ['app-server', '--listen', 'stdio://'];
  for (const name of ['events.jsonl', 'raw-protocol.jsonl', 'raw-stdout.jsonl', 'stderr.txt']) writeFileSync(join(directory, name), '', { flag: 'wx' });
  await json(join(directory, 'configured-controls.json'), expectedControls);
  await writeFile(join(directory, 'prompt.txt'), prompt, { flag: 'wx' });
  const start = performance.now(), pendingRequests = new Map(), requests = [], errors = [];
  let nextId = 1, stopped = false, stopReason = null, killTimer, timedOut = false, malformedLines = 0, effectiveControls = null, threadResponse = null, initialized = false;
  const child = spawn(executable, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], detached: true });
  const childIdentity = identity(child.pid), owned = new Map();
  const reader = scopedProcessReader({ bootId: readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() });
  const completion = new Promise(done => { child.once('error', e => done({ exitCode: null, signal: null, spawnError: e.message })); child.once('close', (exitCode, signal) => done({ exitCode, signal })); });
  child.stdin.on('error', e => { if (!stopped) fail(`Native stdin failure: ${e.code ?? 'unknown'}`); });
  const stop = () => {
    if (stopped) return; stopped = true;
    child.stdin.end();
    killTimer = setTimeout(() => {
      if (childIdentity && identity(child.pid) === childIdentity) {
        try { process.kill(-child.pid, 'SIGTERM'); } catch {}
        killTimer = setTimeout(() => { if (identity(child.pid) === childIdentity) { try { process.kill(-child.pid, 'SIGKILL'); } catch {} } }, 1000);
      }
    }, 1000);
  };
  function fail(reason) { stopReason ??= reason; errors.push(reason); stop(); }
  const raw = (direction, message) => appendFileSync(join(directory, 'raw-protocol.jsonl'), JSON.stringify({ direction, elapsedMs: performance.now() - start, message }) + '\n');
  const send = message => { if (!stopped) { raw('sent', message); child.stdin.write(JSON.stringify(message) + '\n'); } };
  const request = (method, params) => {
    const id = nextId++;
    return new Promise((accept, reject) => { pendingRequests.set(id, { accept, reject, method }); send({ id, method, params }); });
  };
  const emit = event => appendFileSync(join(directory, 'events.jsonl'), JSON.stringify(event) + '\n');
  const transcript = new NativeTranscript({ emit, fail, scenario });
  await json(join(directory, 'process.json'), { pid: child.pid ?? null, identity: childIdentity, args, cwd, startedAt: new Date().toISOString() });
  const sampler = createBoundedSampler({ scan: async () => {
    if (!child.pid || !childIdentity) throw new Error('Initial native process identity unavailable.');
    await discoverOwnedProcesses({ leader: { pid: child.pid, identity: childIdentity }, owned, reader });
  }, onError: () => fail('Owned process observation failed') });
  const decoder = new StringDecoder('utf8'); let buffer = '';
  const inspect = line => {
    let message; try { message = JSON.parse(line); } catch { malformedLines++; return fail('Malformed native JSON line'); }
    raw('received', message);
    if (message.id !== undefined && message.method) {
      requests.push(message); emit({ type: 'native.request', native: message });
      // Do not auto-grant approvals, supply invented answers, or execute client-side tools.
      return fail(`Unsupported native server request left unresolved: ${message.method}`);
    }
    if (message.id !== undefined) {
      const entry = pendingRequests.get(message.id);
      if (!entry) return fail('Native response has unknown request id.');
      pendingRequests.delete(message.id);
      if (message.error) entry.reject(new Error(`Native ${entry.method} request failed (${message.error.code})`));
      else if (!Object.hasOwn(message, 'result')) entry.reject(new Error('Native response missing result'));
      else entry.accept(message.result);
      return;
    }
    if (typeof message.method !== 'string') return fail('Native message lacks method/id.');
    try { transcript.accept(message); } catch { fail('Malformed native notification payload.'); }
    if (transcript.terminal) stop();
  };
  child.stdout.on('data', data => {
    appendFileSync(join(directory, 'raw-stdout.jsonl'), data); buffer += decoder.write(data);
    let n; while ((n = buffer.indexOf('\n')) >= 0) { const line = buffer.slice(0, n); buffer = buffer.slice(n + 1); if (line.trim()) inspect(line); }
  });
  child.stderr.on('data', data => appendFileSync(join(directory, 'stderr.txt'), data));
  const timer = setTimeout(() => { timedOut = true; fail('Native capture timeout'); }, scenario.budget.timeoutMs);
  const workflow = (async () => {
    const init = await request('initialize', { clientInfo: { name: 'quickstark_native_trials', version: '1.0.0' }, capabilities: { experimentalApi: true, mcpServerOpenaiFormElicitation: false, optOutNotificationMethods: [] } });
    initialized = true; await json(join(directory, 'initialize-response.json'), init);
    send({ method: 'initialized', params: {} });
    if (stopped) return;
    threadResponse = await request('thread/start', { cwd: resolve(cwd), ephemeral: true });
    await json(join(directory, 'thread-start-response.json'), threadResponse);
    effectiveControls = validateNativeControls(expectedControls, threadResponse, cwd);
    if (JSON.stringify(readNativeControls()) !== JSON.stringify(expectedControls)) throw new Error('Configured controls changed during native initialization.');
    transcript.threadId = threadResponse.thread.id;
    if (readinessOnly) return stop();
    if (stopped) return;
    const input = [{ type: 'text', text: prompt, text_elements: [] }];
    if (referenceImage) input.unshift({ type: 'localImage', path: resolve(referenceImage) });
    const response = await request('turn/start', { threadId: transcript.threadId, input, cwd: resolve(cwd) });
    if (!response.turn?.id) throw new Error('Native turn/start response missing turn id.');
    if (transcript.turnId && transcript.turnId !== response.turn.id) throw new Error('Native turn/start identity mismatch.');
    transcript.turnId = response.turn.id;
  })().catch(error => fail(error.message));
  const result = await completion;
  buffer += decoder.end(); if (buffer.trim()) inspect(buffer);
  for (const entry of pendingRequests.values()) entry.reject(new Error(`Native transport closed before ${entry.method} response`));
  pendingRequests.clear(); await workflow;
  clearTimeout(timer); clearTimeout(killTimer);
  const sampling = await sampler.finish();
  const cleanup = await cleanupObservedProcesses({ owned, reader });
  if (!readinessOnly && !transcript.terminal) stopReason ??= 'Missing native terminal notification';
  const savedImages = [];
  for (const item of transcript.tools.values()) if (item.type === 'imageGeneration' && item.savedPath) {
    try {
      if (!isAbsolute(item.savedPath)) throw new Error('Image path is not absolute');
      const stat = await lstat(item.savedPath);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 50 * 1024 * 1024) throw new Error('Returned image is not a bounded regular file');
      const bytes = await readFile(item.savedPath);
      const format = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : bytes[0] === 255 && bytes[1] === 216 ? 'jpeg' : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : null;
      if (!format) throw new Error('Returned path is not a recognized raster');
      await mkdir(join(directory, 'generated-images'), { recursive: true });
      const archived = `generated-images/${savedImages.length}.${format}`;
      await writeFile(join(directory, archived), bytes, { flag: 'wx' });
      savedImages.push({ itemId: item.id, savedPath: item.savedPath, archived, sha256: sha(bytes), bytes: bytes.length, format, nativeStatus: item.status });
    } catch (error) { savedImages.push({ itemId: item.id, savedPath: item.savedPath, error: error.message }); }
  }
  const response = transcript.response(), toolItems = [...transcript.tools.values()];
  await writeFile(join(directory, 'response.md'), response, { flag: 'wx' });
  const unclassifiedToolItems = toolItems.filter(i => ['dynamic_tool_call', 'function_call_output', 'mcp_tool_call', 'command_execution', 'collab_tool_call'].includes(i.type)).map(i => i.id);
  const telemetry = { ...result, elapsedMs: performance.now() - start, timedOut, interrupted: Boolean(result.signal), stopReason, malformedLines,
    observedModel: threadResponse?.model ?? null, effectiveControls, configuredControls: expectedControls, initialized, readinessOnly,
    usage: transcript.usage ? [usageFields(transcript.usage.total)] : [], nativeUsage: transcript.usage,
    completedTurn: transcript.terminal?.status === 'completed', responsePresent: Boolean(response.trim()),
    toolItems, toolCount: toolItems.length, observedNamedImageCalls: transcript.imageCalls(), savedImages, serverRequests: requests, protocolErrors: errors,
    unknownItemIds: transcript.unknownItems, unknownItemMethods: transcript.unknownMethods, unclassifiedToolItems,
    imageCallClassification: 'Native imageGeneration items and explicitly named image tools are counted by unique id. Shell/MCP/dynamic/delegation semantics require independent review; these items never certify zero image calls automatically.',
    nativeStreamComplete: Boolean(transcript.terminal) && !stopReason && !malformedLines && !transcript.open.size && !transcript.unknownItems.length && !transcript.unknownMethods.length,
    processCleanup: cleanup.cleanup, observedOwnedResidualProcesses: cleanup.residual,
    processObservation: { ...sampling, cleanupErrors: cleanup.errors, complete: !sampling.errors.length && cleanup.complete,
      scope: 'Only leader/previously observed owned PIDs and their children; unseen processes detaching between samples are not proven absent.' },
    runnerSHA256: sha(await readFile(runnerPath)), promptSHA256: sha(prompt), promptUtf8Bytes: Buffer.byteLength(prompt), args,
    runtimeFiles: Object.fromEntries(await Promise.all(['events.jsonl', 'raw-protocol.jsonl', 'raw-stdout.jsonl', 'stderr.txt'].map(async name => [name, sha(await readFile(join(directory, name)))]))) };
  await json(join(directory, 'telemetry.json'), telemetry); return telemetry;
}

export const executeNative = options => captureNative(options);
export const probeNativeReadiness = ({ cwd, directory, executable }) => captureNative({ prompt: '', cwd, directory, executable,
  scenario: { mode: 'readiness', budget: { timeoutMs: 30000, maximumImageCalls: 0 } } }, true);
