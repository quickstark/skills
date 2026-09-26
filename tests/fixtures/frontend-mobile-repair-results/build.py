#!/usr/bin/env python3
"""Archive the one closed mobile qualification without changing its evidence."""
import hashlib,json,pathlib,stat,subprocess,tempfile,shutil
HERE=pathlib.Path(__file__).resolve().parent
SOURCE=pathlib.Path('/tmp/qs-frontend-mobile-native-qualification-20260926')
PREP=HERE.parent/'frontend-mobile-repair'
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def put(p,x):
 with p.open('x')as f:json.dump(x,f,indent=2);f.write('\n')
def inventory(root):
 rows=[]
 for p in sorted(root.rglob('*')):
  s=p.lstat();assert not p.is_symlink();assert stat.S_ISREG(s.st_mode)or stat.S_ISDIR(s.st_mode)
  row={'path':p.relative_to(root).as_posix(),'type':'file'if p.is_file()else'directory','mode':stat.S_IMODE(s.st_mode)}
  if p.is_file():row.update(bytes=s.st_size,sha256=digest(p))
  rows.append(row)
 return rows
entries=inventory(SOURCE)
summary=json.loads((SOURCE/'run-summary.json').read_text())
assert summary['expected']==summary['settled']==6 and len(summary['records'])==6 and not summary['interrupted']
assert len(list((SOURCE/'reviewer-bundles').glob('*/context.json')))==6
claim=json.loads((PREP/'run-claim.json').read_text())
assert claim['output']==str(SOURCE) and claim['planSha256']==digest(PREP/'plan.json')
plan=json.loads((PREP/'plan.json').read_text())
for row in summary['records']:
 assert row['status']=='fulfilled'
 binding=json.loads((SOURCE/row['row']['trialId']/'binding.json').read_text())
 assert binding['planSHA256']==claim['planSha256']
for name,value in plan['fileManifest'].items():
 p=PREP/name;assert p.stat().st_size==value['bytes']and digest(p)==value['sha256']
file_manifest={'schemaVersion':1,'archiveTopLevel':SOURCE.name,'source':str(SOURCE),'entries':entries}
put(HERE/'file-manifest.json',file_manifest)
frozen=[]
for entry in inventory(PREP):
 if entry['type']!='file':continue
 source=PREP/entry['path'];target=HERE/'frozen-inputs'/entry['path'];target.parent.mkdir(parents=True,exist_ok=True)
 with source.open('rb')as src,target.open('xb')as dst:shutil.copyfileobj(src,dst)
 frozen.append({'source':str(source),'archivedPath':target.relative_to(HERE).as_posix(),'bytes':entry['bytes'],'sha256':entry['sha256']})
put(HERE/'frozen-bindings.json',{'planSHA256':claim['planSha256'],'files':frozen,'scope':'Exact qualification preparation including source snapshots, proposed patch, launcher, tests, all criteria, frozen plan and actual one-attempt claim. Recorder dependencies remain hash-bound in the plan; every used verbatim guidance body is also preserved in each trial before/after.'})
parts=[];whole=hashlib.sha256();total=0
with tempfile.TemporaryDirectory(prefix='qs-mobile-archive-build-')as tmp:
 compressed=pathlib.Path(tmp)/'evidence.tar.zst'
 with compressed.open('xb')as out:
  tar=subprocess.Popen(['tar','--format=pax','-C',str(SOURCE.parent),'-cf','-',SOURCE.name],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  zstd=subprocess.Popen(['zstd','-T2','-10','-c'],stdin=tar.stdout,stdout=out,stderr=subprocess.PIPE);tar.stdout.close()
  ze=zstd.communicate()[1];te=tar.communicate()[1]
  assert zstd.returncode==0,ze.decode();assert tar.returncode==0,te.decode()
 with compressed.open('rb')as f:
  n=0
  while True:
   b=f.read(64*1024*1024)
   if not b:break
   n+=1;name=f'mobile-native.tar.zst.part-{n:03d}'
   with (HERE/name).open('xb')as out:out.write(b)
   whole.update(b);total+=len(b);parts.append({'file':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
assert inventory(SOURCE)==entries,'Original evidence changed during archive.'
facts={'requested':6,'recorded':6,'captureFailures':sum(bool(x['result']['failed'])for x in summary['records']),'interrupted':False,'reviewerBundles':6}
archive={'schemaVersion':1,'format':'POSIX pax tar compressed as one Zstandard stream; reconstruct parts in listed byte order','archiveTopLevel':SOURCE.name,'compression':'zstd -T2 -10','fileCount':sum(x['type']=='file'for x in entries),'directoryCount':sum(x['type']=='directory'for x in entries),'uncompressedFileBytes':sum(x.get('bytes',0)for x in entries),'compressedBytes':total,'compressedSHA256':whole.hexdigest(),'parts':parts,'fileManifestSHA256':digest(HERE/'file-manifest.json'),'frozenBindingsSHA256':digest(HERE/'frozen-bindings.json'),'planSHA256':claim['planSha256'],'captureFacts':facts,'limit':'Capture completion is not quality acceptance or adoption. Independent review pending; parent reports a candidate brand defect. Original F09 failures remain unchanged; no pooling or exact-size support claim. No quality exclusions.'}
put(HERE/'archive.json',archive)
print(json.dumps({'files':archive['fileCount'],'directories':archive['directoryCount'],'compressedBytes':total,'parts':len(parts),'planSHA256':claim['planSha256']}))
