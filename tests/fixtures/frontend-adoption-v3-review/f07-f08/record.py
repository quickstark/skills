"""Format explicitly supplied reviewer judgments; no default grades/check passes."""
import json,pathlib,hashlib,subprocess
HERE=pathlib.Path(__file__).resolve().parent
ROOT=pathlib.Path('/tmp/qs-frontend-comparison-v3-native-20260926/reviewer-bundles')
NONTOOLS={'userMessage','agent_message','reasoning','plan','contextCompaction','enteredReviewMode','exitedReviewMode'}
def write(name,decision,classes,images):
 p=ROOT/name;r=json.loads(subprocess.check_output(['python3',str(HERE/'review_inspect.py'),'bindings',name],text=True));r.update(decision)
 r['screenshotsOpened']=[str(p/x)for x in images]
 items=[]
 for line,text in enumerate((p/'events.jsonl').read_text().splitlines(),1):
  e=json.loads(text);i=e.get('item')
  if e.get('type')=='item.completed'and i and i['type']not in NONTOOLS:
   declaration=classes.pop(line)
   if isinstance(declaration,str):declaration={'classification':declaration,'imageGeneration':False,'publication':False}
   items.append({'id':i['id'],'eventLine':line,'type':i['type'],'itemSha256':hashlib.sha256(json.dumps(i,sort_keys=True,separators=(',',':')).encode()).hexdigest(),**declaration})
 assert not classes,'Unmatched tool classification'
 r['nativeToolAuthorityReview']={'counting':'Unique completed tool IDs; native duplicates/deltas are not extra calls.','classifiedItems':items,'allUnclassifiedIdsResolved':True,'imageGenerationCalls':sum(x['imageGeneration']for x in items),'imageViewCalls':sum(x['type']=='image_view'for x in items),'limits':'Every listed action/helper and non-guidance result was inspected without execution/rerender. No semantic absence is inferred from native named count alone. Process evidence covers observed owned PIDs only.'}
 r['passes']=['Read exact task/common facts and fixed rubric without source/operator mapping or other reviewer scores.','Inspect input/output files, complete tool actions/helper bodies and non-guidance runtime results, retaining failures.','Open actual wide/narrow images and reconcile visual findings with independent uniform HTTP observations and task-specific evidence.','Bind exact files/items/rubric; record original judgments and inherited/evidence limitations without comparison or adoption.']
 assert set(r['dimensions'])==set(json.loads((p/'context.json').read_text())['rubric']['dimensions'])
 dest=HERE/(name+'.json');assert not dest.exists(),'Reviews are append-only; deliberate correction must be separately explained';dest.write_text(json.dumps(r,indent=2)+'\n')
