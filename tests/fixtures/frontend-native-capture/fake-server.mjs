#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';

if (process.argv.includes('--version')) { console.log('codex-cli 0.153.4-native-fixture'); process.exit(0); }
const config = JSON.parse(readFileSync('fixture-case.json', 'utf8'));
const output = message => process.stdout.write(JSON.stringify(message) + '\n');
const notify = (method, params) => output({ method, params });
const item = (type, id, rest = {}) => ({ type, id, ...rest });
const emitItem = (value, complete = true) => notify(complete ? 'item/completed' : 'item/started', { threadId: 'thread-1', turnId: 'turn-1', item: value });
const finish = (items = []) => notify('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed', items } });
const agent = () => emitItem(item('agentMessage', 'answer', { text: 'Actual fixture response.' }));
const input = createInterface({ input: process.stdin });
let keepAlive;
input.on('close', () => { if (config.kind !== 'timeout') { clearInterval(keepAlive); process.exit(0); } });
input.on('line', line => {
  const message = JSON.parse(line);
  appendFileSync('fixture-requests.jsonl', line + '\n');
  if (message.method === 'initialize') return output({ id: message.id, result: { userAgent: 'fixture', platformFamily: 'unix' } });
  if (message.method === 'initialized') return;
  if (message.method === 'thread/start') {
    const c = config.controls;
    const result = { thread: { id: 'thread-1' }, model: c.model, modelProvider: 'fixture', cwd: process.cwd(),
      approvalPolicy: c.approval_policy, approvalsReviewer: c.approvals_reviewer, reasoningEffort: c.model_reasoning_effort,
      sandbox: { type: { 'workspace-write': 'workspaceWrite', 'read-only': 'readOnly', 'danger-full-access': 'dangerFullAccess' }[c.sandbox_mode] } };
    if (config.kind === 'control-mismatch') result[config.field] = config.value;
    output({ id: message.id, result }); return;
  }
  if (message.method !== 'turn/start') throw new Error('Unexpected client request');
  output({ id: message.id, result: { turn: { id: 'turn-1' } } });
  notify('turn/started', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'inProgress', items: [] } });
  if (config.userMessage) emitItem(item('userMessage', 'user-1', { content: message.params.input }));
  if (config.guidanceReadPath) emitItem(item('commandExecution', 'guidance-read', { command: `cat -- '${resolve(config.guidanceReadPath).replaceAll("'", "'\\''")}'`, cwd: process.cwd(), commandActions: [], status: 'completed', exitCode: 0, aggregatedOutput: readFileSync(config.guidanceReadPath, 'utf8') }));
  if (config.kind === 'malformed') return process.stdout.write('{invalid JSON\n');
  if (config.kind === 'missing-terminal') { agent(); return setTimeout(() => process.exit(0), 20); }
  if (config.kind === 'timeout') { keepAlive = setInterval(() => {}, 1000); return; }
  if (config.kind === 'approval') return output({ id: 'approval-7', method: 'item/commandExecution/requestApproval', params: { threadId: 'thread-1', command: 'dangerous fixture command' } });
  if (config.kind === 'unknown') { emitItem(item('futureOpaqueTool', 'opaque', { argument: 'kept' })); return; }
  if (config.kind === 'unknown-item-notification') return notify('item/futureTool/invoked', { threadId: 'thread-1', argument: 'kept' });
  if (config.kind === 'wrong-thread') return notify('item/completed', { threadId: 'other-thread', item: item('imageGeneration', 'other-image') });
  if (config.kind === 'open-item') { emitItem(item('imageView', 'open-view', { path: '/tmp/fixture.png' }), false); agent(); return finish(); }
  if (config.kind === 'failed-turn') { agent(); return notify('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'failed', items: [], error: { message: 'fixture failure' } } }); }
  if (config.kind === 'dynamic') emitItem(item('dynamicToolCall', 'dynamic-1', { namespace: 'custom', tool: 'opaque_operation', arguments: { a: 1 }, contentItems: [], status: 'completed', success: true }));
  if (config.kind === 'full' || config.kind === 'descendant') {
    const command = item('commandExecution', 'command-1', { command: 'fixture actual command', status: 'inProgress', cwd: process.cwd(), commandActions: [] });
    emitItem(command, false);
    notify('item/commandExecution/outputDelta', { threadId: 'thread-1', itemId: command.id, delta: 'first ' });
    notify('item/commandExecution/outputDelta', { threadId: 'thread-1', itemId: command.id, delta: '日本語\n' });
    emitItem({ ...command, status: 'completed', exitCode: 0, aggregatedOutput: null });
  }
  if (config.kind === 'full' || config.kind === 'image-budget' || config.kind === 'prompt-tool') {
    const imagePath = join(process.cwd(), 'actual.png');
    writeFileSync(imagePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64'));
    emitItem(item('imageGeneration', 'image-1', { status: 'inProgress', result: '' }), false);
    emitItem(item('imageGeneration', 'image-1', { status: 'completed', result: '', savedPath: imagePath }));
    emitItem(item('imageView', 'view-1', { path: imagePath }), false);
    emitItem(item('imageView', 'view-1', { path: imagePath }));
  }
  if (config.kind === 'descendant') {
    const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { detached: true, stdio: 'ignore' });
    writeFileSync('descendant-pid.txt', String(child.pid)); child.unref();
    keepAlive = setInterval(() => {}, 1000);
    return setTimeout(() => { agent(); finish(); }, config.holdMs ?? 450);
  }
  if (config.kind === 'reconcile') {
    const view = item('imageView', 'terminal-view', { path: '/tmp/fixture.png' }); emitItem(view, false); agent(); return finish([view]);
  }
  notify('thread/tokenUsage/updated', { threadId: 'thread-1', turnId: 'turn-1', tokenUsage: { total: { inputTokens: 111, cachedInputTokens: 22, outputTokens: 33, reasoningOutputTokens: 4, totalTokens: 144 }, last: {} } });
  agent(); finish();
});
