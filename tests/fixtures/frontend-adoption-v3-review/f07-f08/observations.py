import json,pathlib,sys
p=pathlib.Path('/tmp/qs-frontend-comparison-v3-native-20260926/reviewer-bundles')/sys.argv[1]
c=json.loads((p/'context.json').read_text());assert c['task']['id'] in ['F07','F08']
o=json.loads((p/'browser/observations.json').read_text());t=json.loads((p/'browser/transport-evidence.json').read_text())
print(json.dumps({'task':c['task'],'health':{k:c['execution'].get(k)for k in ['nativeStreamComplete','protocolErrors','serverRequests','observedOwnedResidualProcesses','observedNamedImageCalls']},'guard':c['guidanceGuard'],'keyboard':o['keyboardSubmission'],'invalid':o['invalidEmail'],'tabs':o['tabSequence'],'views':{k:{'scrollWidth':v['scrollWidth'],'controls':v['controls'],'typography':v['typography']}for k,v in o['views'].items()},'transportPass':t['unchanged']and t['reportComplete']and not t['failure']and t['sourceBefore']==t['sourceAfter']==t['copyBefore']==t['copyAfter']},indent=2))
print((p/'response.md').read_text())
for n,l in enumerate((p/'events.jsonl').read_text().splitlines(),1):
 e=json.loads(l);i=e.get('item',{})
 if e.get('type')=='item.completed' and str(n) in sys.argv[2:]: print(n,i.get('exit_code'),i.get('aggregated_output'))
