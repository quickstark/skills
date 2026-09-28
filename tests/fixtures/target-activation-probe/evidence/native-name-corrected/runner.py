#!/usr/bin/env python3
"""Discover real projected packages in isolated Codex/Pi homes; never send model turns."""
import argparse, json, os, pathlib, selectors, signal, subprocess, tempfile, time

p = argparse.ArgumentParser()
p.add_argument('--repository', required=True)
p.add_argument('--output', required=True)
a = p.parse_args()
repo, out = pathlib.Path(a.repository).resolve(), pathlib.Path(a.output).resolve()
out.mkdir(parents=True, exist_ok=False)
base = pathlib.Path(tempfile.mkdtemp(prefix='qs-target-native-'))
home, work = base/'home', base/'workspace'
for d in [home/'.codex', home/'.pi/agent', work/'.git']:
    d.mkdir(parents=True)
env = dict(os.environ, HOME=str(home), USERPROFILE=str(home), CODEX_HOME=str(home/'.codex'),
           PI_CODING_AGENT_DIR=str(home/'.pi/agent'), PI_OFFLINE='1', PI_TELEMETRY='0')
packages = ['qs-skills', 'qs-specialists', 'qs-advanced', 'qs-frontend', 'qs-video', 'qs-execution']
expected = '''qs-help qs-setup qs-plan-clarify qs-plan-roadmap qs-plan-spec qs-code-build qs-code-debug qs-review-code qs-git-merge qs-deploy-release qs-flow-triage qs-flow-handoff
qs-plan-research qs-design-prototype qs-code-document qs-test-author qs-test-verify qs-learn-teach qs-skill-write qs-deploy-prompt
qs-how qs-why qs-blast-radius qs-runtime-forensics qs-trace-forensics qs-create-verification-skill qs-maintain-verification-skill qs-skill-eval qs-hillclimb qs-visual-parity qs-pr-babysit qs-worktree-cleanup
qs-design-frontend qs-design-image-web qs-design-image-mobile qs-design-image-to-code qs-video qs-unlazy'''.split()
record = {'repository': str(repo), 'workspace': str(work), 'home': str(home), 'modelRequests': 0,
          'expected': sorted(expected), 'commands': [], 'rpc': {}, 'limitations': 'Enumeration proves native discovery only, not model routing or full installed-machine migration.'}
def save():
    (out/'result.json').write_text(json.dumps(record, indent=2)+'\n')
def run(args):
    r = subprocess.run(args, cwd=work, env=env, capture_output=True, text=True, timeout=40)
    record['commands'].append({'args': args, 'exitCode': r.returncode, 'stdout': r.stdout, 'stderr': r.stderr})
    save()
    if r.returncode: raise RuntimeError('Native isolated command failed: '+args[0])
    return r.stdout
def rpc(host, args, requests):
    proc = subprocess.Popen(args, cwd=work, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, text=True, bufsize=1, start_new_session=True)
    sel=selectors.DefaultSelector()
    sel.register(proc.stdout,selectors.EVENT_READ,'stdout'); sel.register(proc.stderr,selectors.EVENT_READ,'stderr')
    evidence={'args':args,'requests':[],'responses':[],'stderr':[]}
    record['rpc'][host]=evidence
    try:
        for request in requests:
            evidence['requests'].append(request)
            proc.stdin.write(json.dumps(request)+'\n'); proc.stdin.flush()
            if 'id' not in request: continue
            deadline=time.monotonic()+45
            found=False
            while time.monotonic()<deadline and not found:
                for key,_ in sel.select(.2):
                    line=key.fileobj.readline()
                    if not line: sel.unregister(key.fileobj); continue
                    if key.data=='stderr': evidence['stderr'].append(line.strip()); continue
                    data=json.loads(line); evidence['responses'].append(data)
                    if data.get('id')==request['id']:
                        if 'error' in data or data.get('success') is False: raise RuntimeError('RPC request failed')
                        found=True
                if proc.poll() is not None and not found: raise RuntimeError('RPC exited before reply')
            if not found: raise TimeoutError('Native discovery response timeout')
        return evidence['responses'][-1]
    finally:
        proc.stdin.close()
        # This parent owns and has not reaped this process: its PID cannot be reused.
        if proc.poll() is None:
            os.killpg(proc.pid,signal.SIGTERM)
            try: proc.wait(timeout=3)
            except subprocess.TimeoutExpired: os.killpg(proc.pid,signal.SIGKILL); proc.wait(timeout=3)
        evidence['exitCode']=proc.returncode
        sel.close();save()
try:
    run(['codex','plugin','marketplace','add',str(repo/'codex')])
    for package in packages: run(['codex','plugin','add',package+'@quickstark','--json'])
    record['inventory']=json.loads(run(['codex','plugin','list','--json']))
    assert sorted(x['name'] for x in record['inventory']['installed'])==sorted(packages)
    codex=rpc('codex',['codex','app-server','--listen','stdio://'],[
        {'jsonrpc':'2.0','id':1,'method':'initialize','params':{'clientInfo':{'name':'qs-target-discovery','version':'1'}}},
        {'jsonrpc':'2.0','method':'initialized','params':{}},
        {'jsonrpc':'2.0','id':2,'method':'skills/list','params':{'cwds':[str(work)],'forceReload':True}}])
    entries=codex['result']['data']; assert len(entries)==1
    assert not entries[0].get('errors'),entries[0].get('errors')
    skills=entries[0]['skills']
    qs=[s for s in skills if str(s.get('pluginId','')).endswith('@quickstark')]
    lengths=[12,8,12,4,1,1]
    expected_literals=[];offset=0
    for package,length in zip(packages,lengths):
        expected_literals.extend(package+':'+name for name in expected[offset:offset+length])
        offset+=length
    assert sorted(s['name'] for s in qs)==sorted(expected_literals),[s['name'] for s in qs]
    assert all(s.get('enabled') is True for s in qs)
    (home/'.pi/agent/settings.json').write_text(json.dumps({'packages':[str(repo/'pi/packages'/x) for x in packages],'quietStartup':True}))
    pi=rpc('pi',['pi','--mode','rpc'],[{'id':'discovery','type':'get_commands'}])
    commands=[s for s in pi['data']['commands'] if s['source']=='skill']
    names=[s['name'].removeprefix('skill:') for s in commands]
    assert sorted(names)==sorted(expected),(names,expected)
    record['status']='passed';record['counts']={'codex':len(qs),'pi':len(names)}
except Exception as e:
    record['status']='failed';record['error']=str(e);raise
finally:
    save()
    print(json.dumps({k:record.get(k) for k in ['status','error','counts','modelRequests','home']}))
