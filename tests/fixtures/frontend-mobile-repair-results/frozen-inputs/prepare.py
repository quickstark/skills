"""Prepare fixture bytes only. Never invoke a model or edit canonical guidance."""
from pathlib import Path
import json, hashlib, difflib, shutil
R = Path(__file__).resolve().parent
OLD = R.parent / 'frontend-adoption-v3'
REPO = R.parents[2]
def sha(b): return hashlib.sha256(b).hexdigest()
def put(p,b):
    p.parent.mkdir(parents=True,exist_ok=True)
    with p.open('xb') as f: f.write(b)
def js(p,x): put(p,(json.dumps(x,indent=2,ensure_ascii=False)+'\n').encode())
original=json.loads((OLD/'scenarios.json').read_text())
case=next(x for x in original if x['id']=='F09')
old='Target 1179×2556 with safe status/home-indicator regions.'
new='Use the available native image tool’s portrait output with safe status/home-indicator regions. Inspect and report each delivered image’s actual pixel dimensions; no exact numeric resolution is requested.'
assert case['input'].count(old)==1
case['input']=case['input'].replace(old,new)
case['requiredChecks'].append('native-portrait-actual-size-reporting')
js(R/'scenarios.json',[case])
js(R/'schedule.json',[x for x in json.loads((OLD/'schedule.json').read_text()) if x['scenarioId']=='F09'])
for name in ['common-scope.json','rubric.json']: put(R/name,(OLD/name).read_bytes())
for p in (OLD/'assets/empty').rglob('*'):
    if p.is_file(): put(R/'assets/empty'/p.relative_to(OLD/'assets/empty'),p.read_bytes())
sources=json.loads((OLD/'sources/index.json').read_text())
selected={k:sources[k] for k in [case['originalSource'],case['localRoot'],*case['references']]}
for k,s in selected.items():
    b=(OLD/s['path']).read_bytes(); assert sha(b)==s['sha256']
    if s.get('canonicalPath'): assert (REPO/s['canonicalPath']).read_bytes()==b
    if k=='mobile-images':
        text=b.decode()
        before='Keep the first screen clear and subsequent screens purposefully varied.'
        insert='''Carry the explicit brand typeface through all app-owned text, including small
navigation labels, selected states, tabs, fields, buttons and confirmation copy.
Do not introduce a secondary app typeface unless the brief permits it. Preserve
the platform's own status/system typography; those system regions are distinct
from app-owned labels. Inspect the actual generated lettering at readable scale.

Raw app screens need a complete opaque background covering the whole canvas,
including safe areas, unless transparency is explicitly requested. Do not deliver
a transparent cutout or floating UI in place of a complete screen. Inspect actual
background/alpha rather than assuming a preview checkerboard is part of the design.

'''
        text=text.replace(before,insert+before)
        text+='''
Inspect each delivered image's actual pixel dimensions. Use only controls exposed
by the available tool; a prompt's requested dimensions do not prove output size.
If a numeric target is unmet, report the actual size and unmet target honestly.
Do not invent a size parameter, silently resize output or spend calls beyond the
budget. A native portrait output is sufficient only when the brief allows it.
'''
        patched=text.encode()
        patch=''.join(difflib.unified_diff(b.decode().splitlines(True),text.splitlines(True),fromfile='a/'+s['canonicalPath'],tofile='b/'+s['canonicalPath']))
        put(R/'mobile-guidance.patch',patch.encode())
        s={**s,'priorQualificationSourceSha256':s['sha256'],'sha256':sha(patched),'proposedPatch':'mobile-guidance.patch'};selected[k]=s;b=patched
    put(R/s['path'],b)
js(R/'sources/index.json',selected)
js(R/'qualification.json',{
 'id':'mobile-native-portrait-qualification-01','predecessor':'frontend-native-events-v3/F09',
 'requestChange':{'removed':old,'replacement':new},
 'independence':'Another reviewer must inspect all twelve actual primary images, native tool evidence and exact hashes. This preparation author does not grade resulting images.',
 'originalOutcome':'Original F09 remains FAILED, including exact1179x2556 fidelity and observed typography defects. Original per-output grades stay immutable; defects are not attributed to outputs where they were not observed.',
 'noncomparability':'Changed resolution requirement and proposed candidate guidance define a separate supported-interface capability qualification. Never pool with or regrade original F09; no exact-resolution capability claim, no inference that all requested numeric dimensions are impossible.',
 'fixedDesign':{'cases':1,'pairedRepetitions':3,'trials':6,'maximumImageCallsPerTrial':2,'requiredImagesPerTrial':2,'retries':0,'expansion':False},
 'reviewAddendum':{
  'native-portrait-actual-size-reporting':'Open and decode both actual primary images; height exceeds width and response reports each exact stored pixel size. Missing size inspection/report remains failed or unverified. Do not infer size from prompt, preview or claimed dimensions.',
  'exact-brand-price':'Brand font applies to all app-owned lettering including selected/navigation/small labels; platform status/system glyph typography stays platform appropriate. Preserve supplied price, content and identity.',
  'raw-screens-safe-areas':'Both images must be separate complete opaque raw screens with coherent backgrounds and safe system regions, no device frame, collage or transparent cutout.',
  'unchanged':'Retain every original required check, all five rubric dimensions and floor3 in all three repetitions. Candidate quality cannot be below matched baseline. Inspect every native/transitive tool action and actual artifacts; runtime completion alone is not quality.'},
 'authority':'Preparation only. Parent must review source, fixed criteria and actual-run authority before launch. Canonical patch application belongs to parent after original aggregation closes. No canonical edit, generation, installed-skill change or service call in preparation.'})
print('Prepared one separate six-trial qualification; no model invoked.')
