import pathlib,hashlib,json,sys
base=pathlib.Path('/home/djn12313');paths=set()
for host in ['.codex','.claude','.pi/agent']:
 root=base/host
 for pattern in ['*.toml','settings*.json','trust.json','plugins/installed_plugins.json','plugins/known_marketplaces.json','plugins/**/plugin.json','plugins/**/marketplace.json','state/*.json']:
  paths.update(root.glob(pattern))
for name in ['.codex/plugins/installed_plugins.json','.codex/plugins/known_marketplaces.json','.pi/agent/trust.json','.pi/agent/settings.json']:
 paths.add(base/name)
records=[]
for p in sorted(paths):
 if p.is_file():records.append({'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':p.stat().st_size})
 else:records.append({'path':str(p),'state':'absent'})
out=pathlib.Path(__file__).parent/('controls-'+sys.argv[1]+'.json');out.write_text(json.dumps(records,indent=2)+'\n');print(out,len(records))
