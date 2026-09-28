#!/usr/bin/env python3
"""Read-only native skills discovery; never creates a thread or sends a turn."""
import argparse, json, pathlib, selectors, subprocess, tempfile, time, shutil, os, signal
parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
parser.add_argument('--transport', choices=['proxy', 'stdio'], default='proxy')
parser.add_argument('--isolated-runtime', action='store_true')
parser.add_argument('--trace-denials', action='store_true')
args = parser.parse_args()
output = pathlib.Path(args.output).resolve()
output.mkdir(parents=True, exist_ok=True)
workspace = pathlib.Path(tempfile.mkdtemp(prefix='qs-native-discovery-'))
(workspace / '.git').mkdir()
for name, marker in [('qs-invocation-context-probe', ''), ('qs-invocation-disabled-probe', 'disable-model-invocation: true\n')]:
    folder = workspace / '.agents' / 'skills' / name
    folder.mkdir(parents=True)
    (folder / 'SKILL.md').write_text(f'---\nname: {name}\ndescription: Local discovery-only fixture; never invoked.\n{marker}---\n\nThis fixture is inspected only by skills/list.\n')
command = ['codex', 'app-server', 'proxy'] if args.transport == 'proxy' else ['codex', 'app-server', '--listen', 'stdio://']
if args.isolated_runtime:
    command += ['-c', 'sqlite_home=' + json.dumps(str(workspace / 'runtime')), '-c', 'log_dir=' + json.dumps(str(workspace / 'logs'))]
trace_path = workspace / 'failed-file-syscalls.txt'
if args.trace_denials:
    command = ['strace', '-f', '-e', 'trace=%file', '-e', 'status=failed', '-o', str(trace_path), '--', *command]
process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1, start_new_session=True)
selector = selectors.DefaultSelector()
selector.register(process.stdout, selectors.EVENT_READ, 'stdout')
selector.register(process.stderr, selectors.EVENT_READ, 'stderr')
results = {'command': command, 'workspace': str(workspace), 'modelRequests': 0, 'requests': [], 'responses': [], 'stderr': [], 'otherMessages': []}
def send(message):
    message = {'jsonrpc': '2.0', **message}
    results['requests'].append(message)
    process.stdin.write(json.dumps(message) + '\n')
    process.stdin.flush()
def wait_response(identifier):
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        for key, _ in selector.select(timeout=0.25):
            line = key.fileobj.readline()
            if not line:
                selector.unregister(key.fileobj)
                continue
            if key.data == 'stderr':
                # Capture diagnostics from this CLI child, never account/config RPCs.
                results['stderr'].append(line.strip())
                continue
            message = json.loads(line)
            if message.get('id') == identifier:
                results['responses'].append(message)
                return message
            results['otherMessages'].append({'method': message.get('method'), 'id': message.get('id')})
        if process.poll() is not None:
            raise RuntimeError(f'CLI exited {process.returncode}')
    raise TimeoutError(f'no response for id {identifier}')
try:
    send({'id': 1, 'method': 'initialize', 'params': {'clientInfo': {'name': 'qs-native-discovery-probe', 'version': '1'}}})
    response = wait_response(1)
    if 'error' in response:
        raise RuntimeError('initialize failed')
    send({'method': 'initialized', 'params': {}})
    send({'id': 2, 'method': 'skills/list', 'params': {'cwds': [str(workspace)], 'forceReload': True}})
    response = wait_response(2)
    if 'error' in response:
        raise RuntimeError('skills/list failed')
    results['status'] = 'completed'
except Exception as error:
    results['status'] = 'failed'
    results['error'] = str(error)
finally:
    if process.stdin:
        process.stdin.close()
    try:
        process.wait(timeout=3)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGTERM)
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=3)
    results['stderr'].extend(line for line in process.stderr.read().splitlines() if line)
    results['exitCode'] = process.returncode
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    if trace_path.exists():
        results['deniedFileOperations'] = [line for line in trace_path.read_text().splitlines() if 'EROFS' in line or 'EACCES' in line]
    selector.close()
    shutil.rmtree(workspace)
    results['workspaceRemoved'] = not workspace.exists()
    (output / 'result.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps({key: results.get(key) for key in ['status', 'error', 'exitCode', 'workspaceRemoved']}))
