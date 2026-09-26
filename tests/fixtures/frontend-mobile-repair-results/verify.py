#!/usr/bin/env python3
"""Verify a closed evidence archive; optionally extract only into a fresh path."""
import argparse,hashlib,json,os,pathlib,stat,subprocess,tarfile,tempfile
HERE=pathlib.Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--extract',type=pathlib.Path);parser.add_argument('--source',type=pathlib.Path);args=parser.parse_args()
def digest_file(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
a=json.loads((HERE/'archive.json').read_text());m=json.loads((HERE/'file-manifest.json').read_text());assert digest_file(HERE/'file-manifest.json')==a['fileManifestSHA256']
expected={e['path']:e for e in m['entries']};assert len(expected)==len(m['entries']);assert sum(e['type']=='file'for e in m['entries'])==a['fileCount']==182;assert len({x.split('/')[0]for x in expected if x.startswith('F')})==6;assert len([x for x in expected if x.startswith('reviewer-bundles/review-')and x.endswith('/context.json')])==6;assert a['archiveTopLevel']==m['archiveTopLevel'];assert len(a['parts'])>=1
assert digest_file(HERE/'frozen-bindings.json')==a['frozenBindingsSHA256']
bindings=json.loads((HERE/'frozen-bindings.json').read_text())
for entry in bindings['files']:
 relative=pathlib.PurePosixPath(entry['archivedPath']);assert not relative.is_absolute()and '..'not in relative.parts and relative.parts[0]=='frozen-inputs'
 p=HERE.joinpath(*relative.parts);assert p.is_file()and not p.is_symlink();assert p.stat().st_size==entry['bytes']and digest_file(p)==entry['sha256']
assert digest_file(HERE/'frozen-inputs/plan.json')==a['planSHA256']==bindings['planSHA256']
assert sum(e['type']=='directory'for e in m['entries'])==a['directoryCount']==49
assert sum(e.get('bytes',0)for e in m['entries'])==a['uncompressedFileBytes']
if args.extract:
 # mkdir without parents/exist_ok refuses existing targets and does not follow one.
 args.extract.mkdir(mode=0o700);destination=args.extract.resolve()
else:destination=None
with tempfile.TemporaryDirectory(prefix='qs-archive-verify-')as tmp:
 compressed=pathlib.Path(tmp)/'archive.tar.zst';whole=hashlib.sha256();total=0
 with compressed.open('xb')as target:
  for part in a['parts']:
   assert pathlib.PurePosixPath(part['file']).name==part['file'];p=HERE/part['file'];assert p.is_file()and not p.is_symlink();assert p.stat().st_size==part['bytes']<100000000;assert digest_file(p)==part['sha256']
   with p.open('rb')as f:
    for b in iter(lambda:f.read(1024*1024),b''):target.write(b);whole.update(b);total+=len(b)
 assert total==a['compressedBytes']and whole.hexdigest()==a['compressedSHA256']
 proc=subprocess.Popen(['zstd','-dc',str(compressed)],stdout=subprocess.PIPE,stderr=subprocess.PIPE);seen=set();root_seen=False
 try:
  with tarfile.open(fileobj=proc.stdout,mode='r|')as tar:
   for member in tar:
    path=pathlib.PurePosixPath(member.name);assert not path.is_absolute()and '..'not in path.parts and path.parts[0]==a['archiveTopLevel'];assert member.isdir()or member.isfile();assert not member.issym()and not member.islnk()
    relative=pathlib.PurePosixPath(*path.parts[1:]).as_posix()
    if relative=='.':
     assert member.isdir()and not root_seen;root_seen=True
     if destination:(destination/a['archiveTopLevel']).mkdir()
     continue
    assert relative not in seen and relative in expected;seen.add(relative);entry=expected[relative];assert member.mode==entry['mode'];assert member.isdir()==(entry['type']=='directory')
    output=destination.joinpath(*path.parts)if destination else None
    if member.isdir():
     if output:output.mkdir();output.chmod(entry['mode'])
     continue
    assert member.size==entry['bytes'];h=hashlib.sha256();reader=tar.extractfile(member);writer=output.open('xb')if output else None
    try:
     for b in iter(lambda:reader.read(1024*1024),b''):
      h.update(b)
      if writer:writer.write(b)
    finally:
     reader.close()
     if writer:writer.close();output.chmod(entry['mode'])
    assert h.hexdigest()==entry['sha256'],relative
  assert root_seen and seen==set(expected)
  stderr=proc.communicate()[1];assert proc.returncode==0,stderr.decode()
 finally:
  if proc.poll()is None:proc.kill();proc.wait()
 if destination:
  root=destination/a['archiveTopLevel'];observed={p.relative_to(root).as_posix()for p in root.rglob('*')};assert observed==set(expected)
  for rel,e in expected.items():
   p=root/rel;assert not p.is_symlink();assert stat.S_IMODE(p.stat().st_mode)==e['mode']
   if e['type']=='file':assert p.stat().st_size==e['bytes']and digest_file(p)==e['sha256']
if args.source:
 observed={p.relative_to(args.source).as_posix()for p in args.source.rglob('*')};assert observed==set(expected)
 for rel,e in expected.items():
  p=args.source/rel;assert not p.is_symlink();assert stat.S_IMODE(p.stat().st_mode)==e['mode']
  if e['type']=='file':assert p.stat().st_size==e['bytes']and digest_file(p)==e['sha256'],rel
print('MOBILE6_ARCHIVE_VERIFIED: 182 files;6 captures;6 opaque bundles;all manifest bytes preserved;'+('fresh extraction verified;'if destination else'')+('original source unchanged;'if args.source else'')+'no quality/adoption judgment')
