#!/usr/bin/env python3
"""Verify review bindings; --run-oracles optionally reruns audited Node fixtures in copies."""
import argparse, collections, hashlib, json, os, pathlib, shutil, signal, socket, subprocess, tempfile, time
parser=argparse.ArgumentParser()
parser.add_argument('--run-oracles', action='store_true')
parser.add_argument('--output', type=pathlib.Path)
args=parser.parse_args()
review_dir=pathlib.Path(__file__).resolve().parent
review=json.loads((review_dir/'current-01-review.json').read_text())
index_path=pathlib.Path(review['sourceIndex'])
assert hashlib.sha256(index_path.read_bytes()).hexdigest()==review['sourceIndexSha256']
index=json.loads(index_path.read_text())
assert len(index['entries'])==len(review['records'])==24
counts=collections.Counter()
for entry, record in zip(index['entries'],review['records']):
    assert entry['id']==record['id'] and entry['files']==record['sourceBindings']
    directory=pathlib.Path(entry['path'])
    for file,digest in entry['files'].items():
        assert hashlib.sha256((directory/file).read_bytes()).hexdigest()==digest,(entry['id'],file)
        counts['files']+=1
    context=json.loads((directory/'review-context.json').read_text())
    assert [item['expected'] for item in record['expectedBehaviors']]==context['case']['expected']
    assert context['execution']==json.loads((directory/'telemetry.json').read_text())
    for stage in ['before','after']:
        for file, expected in context[stage].items():
            data=(directory/stage/file).read_bytes()
            assert len(data)==expected['bytes'] and hashlib.sha256(data).hexdigest()==expected['sha256']
    for item in record['expectedBehaviors']+record['crossCutting']:
        assert item['status'] in ['pass','fail','unverified'] and item['rationale']
    for item in record['expectedBehaviors']:
        for evidence in item['evidence']:
            lines=(directory/evidence['file']).read_text().splitlines()
            assert evidence['quote'] in lines[evidence['line']-1]
    assert record['status'] in ['pass','fail','unverified']
    counts[record['status']]+=1
assert counts['files']==133
assert {key:counts[key] for key in review['summary']}==review['summary']
print(json.dumps({'bindingChecks':'passed','counts':dict(counts)}))
if not args.run_oracles:
    raise SystemExit(0)
if args.output is None:
    parser.error('--run-oracles requires a new --output directory')
output=args.output.resolve()
output.mkdir(parents=True,exist_ok=False)
def hash_file(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def port_closed(port):
    with socket.socket() as s:
        s.settimeout(1)
        try: s.connect(('127.0.0.1',port))
        except ConnectionRefusedError: return True
        return False
results=[]
for case_id in ['X1','X2']:
    case=next(entry for entry in index['entries'] if entry['id']==case_id)
    temporary=pathlib.Path(tempfile.mkdtemp(prefix=f'qs-reviewed-{case_id}-'))
    copied=temporary/'workspace'
    shutil.copytree(pathlib.Path(case['path'])/'after',copied)
    baseline={p.relative_to(copied).as_posix():hash_file(p) for p in copied.rglob('*') if p.is_file()}
    case_out=output/case_id
    case_out.mkdir()
    try:
        operations=[['--doctor'],[],[]] if case_id=='X2' else [[],[]]
        for number,flags in enumerate(operations,1):
            prior={p.relative_to(copied).as_posix() for p in (copied/'verification/evidence').rglob('*') if p.is_file()}
            command=['node',str(copied/'verification/run.cjs'),*flags]
            process=subprocess.Popen(command,cwd=temporary,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,start_new_session=True)
            timed_out=False
            residual_group=False
            try:
                try: stdout,stderr=process.communicate(timeout=25)
                except subprocess.TimeoutExpired:
                    timed_out=True
                    os.killpg(process.pid,signal.SIGKILL)
                    stdout,stderr=process.communicate(timeout=5)
            finally:
                # This group was created by this exact invocation. Never signal archived PIDs.
                try:
                    os.killpg(process.pid,0)
                    residual_group=True
                    os.killpg(process.pid,signal.SIGKILL)
                except ProcessLookupError: pass
                process.wait(timeout=5)
            (case_out/f'command-{number}.stdout.txt').write_text(stdout)
            (case_out/f'command-{number}.stderr.txt').write_text(stderr)
            assert not timed_out,(case_id,'timeout')
            assert not residual_group,(case_id,'owned process group remained after verifier exit; oracle cleaned it')
            assert process.returncode==(0 if case_id=='X1' or flags else 1),(case_id,process.returncode)
            added=[p for p in (copied/'verification/evidence').rglob('*') if p.is_file() and p.relative_to(copied).as_posix() not in prior]
            documents=[json.loads(p.read_text()) for p in added if p.suffix=='.json']
            reports=[d for d in documents if ('checks' in d and 'passed' in d) or 'sessions' in d]
            assert len(reports)==1
            report=reports[0]
            if case_id=='X1':
                assert report['passed'] is True
                assert report['observations']['readiness']['body']=={'ready':True}
                assert report['observations']['sum7+5']['body']=={'result':12}
                assert report['observations']['export']['status']==404
                assert report['cleanup']['ownedProcessStopped'] and report['closed']
                assert report['exit']=={'code':0,'signal':None}
                assert 'known-bad sum rejected' in report['checks']
                assert port_closed(report['port'])
            elif flags:
                assert report['mode']=='doctor' and report['passed'] is True and not report['sessions']
            else:
                assert report['passed'] is False
                assert [f['name'] for f in report['features']]==['sum','export']
                assert report['features'][0]['response']['json']['result']==2
                assert report['features'][0]['expected']==12
                assert report['features'][1]['response']['status']==404
                assert report['features'][1]['expected']=='download'
                assert all(f['status']=='failed' and f['classification']=='product' for f in report['features'])
                assert all(d['passed'] for d in report['doctors'])
                assert len([d for d in report['doctors'] if d.get('response',{}).get('route')=='/health'])==3
                assert report['sessions']
                for session in report['sessions']:
                    assert session['cleanupConfirmed'] and session['exit']=={'code':0,'signal':None}
                    assert port_closed(session['port'])
            for file,digest in baseline.items(): assert hash_file(copied/file)==digest,('changed original evidence/product',case_id,file)
            for p in added:
                destination=case_out/p.relative_to(copied)
                destination.parent.mkdir(parents=True,exist_ok=True)
                shutil.copyfile(p,destination)
            results.append({'case':case_id,'operation':flags or ['run'],'exitCode':process.returncode,'artifactCount':len(added),'checks':'passed','evidencePreservedAfterChildCleanup':True})
    finally:
        # Retain new evidence even when an independent assertion fails.
        for p in (copied/'verification/evidence').rglob('*'):
            if p.is_file() and p.relative_to(copied).as_posix() not in baseline:
                destination=case_out/p.relative_to(copied)
                destination.parent.mkdir(parents=True,exist_ok=True)
                if not destination.exists(): shutil.copyfile(p,destination)
        shutil.rmtree(temporary)
(output/'oracle-summary.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'oracleChecks':'passed','output':str(output),'runs':results}))
