#!/usr/bin/env python3
"""Read only opaque F07/F08 reviewer bundles; never open mapping or trial roots."""
import hashlib,json,pathlib,re,sys,difflib
ROOT=pathlib.Path('/tmp/qs-frontend-comparison-v3-native-20260926/reviewer-bundles')
SCOPE={'F07','F08'}
def digest(b):return hashlib.sha256(b).hexdigest()
def canonical(v):return digest(json.dumps(v,sort_keys=True,separators=(',',':')).encode())
def inventory(root):
 out={}
 for p in sorted(root.rglob('*')):
  if p.is_symlink():raise ValueError('Evidence link rejected')
  if p.is_file():
   b=p.read_bytes();out[str(p.relative_to(root))]={'sha256':digest(b),'bytes':len(b)}
 return out
def open_bundle(name):
 if not re.fullmatch(r'review-[a-f0-9]{16}',name):raise ValueError('Opaque ID required')
 p=ROOT/name
 if p.resolve()!=p:raise ValueError('Regular bundle directory required')
 c=json.loads((p/'context.json').read_text())
 if c['task']['id']not in SCOPE:raise ValueError('Outside independent review scope')
 if not(p/'IMAGES.md').is_file():raise ValueError('Bundle not complete')
 return p,c
if sys.argv[1:] == ['discover']:
 out=[]
 for p in sorted(ROOT.glob('review-*/context.json')):
  try:
   c=json.loads(p.read_text())
   if c.get('task',{}).get('id')in SCOPE and(p.parent/'IMAGES.md').is_file():out.append({'reviewId':p.parent.name,'scenarioId':c['task']['id']})
  except (OSError,ValueError):pass
 print(json.dumps(out,indent=2));sys.exit()
p,c=open_bundle(sys.argv[2]); mode=sys.argv[1]
if mode=='context':
 print(json.dumps({k:c[k]for k in ['reviewId','task','commonScope','browserStatus','guidanceGuard','execution']},indent=2));print(json.dumps({'files':list(inventory(p))},indent=2))
elif mode=='tools':
 for line,text in enumerate((p/'events.jsonl').read_text().splitlines(),1):
  if not text.strip():continue
  e=json.loads(text);i=e.get('item')
  if e.get('type')!='item.completed' or not i or i.get('type')in['userMessage','agent_message','reasoning','plan','contextCompaction','enteredReviewMode','exitedReviewMode']:continue
  # Guidance can survive in partial output chunks. Do not display tool output at
  # all here; only exact action/arguments. Product/helper files are read separately.
  action={k:v for k,v in i.items()if k not in ['aggregated_output','aggregatedOutput','output','result','contentItems','content','text']}
  meta={'eventLine':line,'id':i.get('id'),'type':i.get('type'),'itemSha256':canonical(i),'exitCode':i.get('exit_code')};print(json.dumps(meta,ensure_ascii=False))
  if i.get('commandActions')and len(i['commandActions'])==1:print(i['commandActions'][0].get('command',i.get('command')))
  elif i.get('command'):print(i['command'])
  else:print(json.dumps(action,ensure_ascii=False))
elif mode=='outputs':
 for line,text in enumerate((p/'events.jsonl').read_text().splitlines(),1):
  if not text.strip():continue
  e=json.loads(text);i=e.get('item')
  if e.get('type')!='item.completed' or not i or i.get('type')in['userMessage','agent_message','reasoning','plan','contextCompaction','enteredReviewMode','exitedReviewMode']:continue
  action=json.dumps({k:v for k,v in i.items()if k in ['command','arguments']})
  output={k:v for k,v in i.items()if k in ['aggregated_output','output','result','contentItems','content','text']}
  guidance='trial-guidance.md'in action or any(marker in json.dumps(output)for marker in ['# Bound task guidance','## Embedded section'])
  print(json.dumps({'eventLine':line,'id':i.get('id'),'type':i.get('type'),'output':'GUIDANCE_OUTPUT_NOT_DISPLAYED'if guidance else output},ensure_ascii=False))
elif mode=='diff':
 before=p/'input-project';after=p/'actual-artifacts';names=sorted(set(inventory(before))|set(inventory(after)))
 for name in names:
  a=before/name;b=after/name
  old=a.read_bytes()if a.exists()else b'';new=b.read_bytes()if b.exists()else b''
  if old==new:continue
  if pathlib.Path(name).suffix.lower()in['.png','.jpg','.jpeg','.webp','.woff','.woff2']:print(f'BINARY CHANGED {name}');continue
  try:print(''.join(difflib.unified_diff(old.decode().splitlines(True),new.decode().splitlines(True),fromfile='input/'+name,tofile='actual/'+name)))
  except UnicodeDecodeError:print(f'BINARY CHANGED {name}')
elif mode=='bindings':
 m=inventory(p);r=pathlib.Path('/github/skills/tests/fixtures/frontend-adoption-v3/rubric.json').read_bytes()
 print(json.dumps({'schemaVersion':1,'trialId':p.name,'scenarioId':c['task']['id'],'reviewer':'adoption_a_ps independent F07-F08 review','bundlePath':str(p),'fileBindings':m,'bundleManifestSha256':canonical(m),'bundleManifestDefinition':'SHA256 sorted compact UTF8 JSON fileBindings; every file separately bound','rubricSha256':digest(r)},indent=2))
else:raise ValueError('Choose discover, context, tools, outputs, diff, bindings')
