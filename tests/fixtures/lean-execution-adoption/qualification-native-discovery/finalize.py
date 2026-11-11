import pathlib,json,hashlib,re,subprocess,shutil
P=pathlib.Path(__file__).parent
def read(name):return json.loads((P/name).read_text())
def rpc(name):return [json.loads(l) for l in read(name)['stdout'] if l.strip().startswith('{')]
def commands(name):return rpc(name)[0]['response']['response']['commands']
controls=[]
for before,after in [('before-normal','after-normal'),('before-corrected','after-corrected'),('before-claude','after-claude'),('before-claude-debug','after-claude-debug')]:
 a,b=read('controls-'+before+'.json'),read('controls-'+after+'.json')
 controls.append({'before':'controls-'+before+'.json','after':'controls-'+after+'.json','sampledFilesAndAbsentPaths':len(a),'identical':a==b})
codex=rpc('codex-native-source-corrected.json')
plugins=[d['result']['plugin'] for d in codex if d.get('id') in range(2,8)]
sourceSkills=[s for p in plugins for s in p['skills']]
installed=next(x['result']['data'] for x in codex if x.get('id')==20)
rawControl,rawSource=commands('claude-control.json'),commands('claude-debug.json')
an,bn={x['name'] for x in rawControl},{x['name'] for x in rawSource}
debug=(P/'claude-native-loader.debug').read_text()
sourcePaths=sorted(set(re.findall(r'Loading from skillPath: (/github/skills/packages/\S+) for plugin',debug)))
overrides=re.findall(r'Plugin "([^"]+)" from --plugin-dir overrides installed version',debug)
pi=read('pi-native-loader.json')
static=read('static-payloads.json')
identities=[]
for name in ['codex','claude','pi']:
 executable=shutil.which(name);r=subprocess.run([executable,'--version'],capture_output=True,text=True)
 identities.append({'name':name,'path':executable,'resolvedPath':str(pathlib.Path(executable).resolve()),'versionStdout':r.stdout,'versionStderr':r.stderr,'exitCode':r.returncode})
schema=P/'codex-schema';keep={'v2/SkillsListParams.json','v2/SkillsListResponse.json','v2/PluginReadParams.json','v2/PluginReadResponse.json'}
removed=[]
for f in schema.rglob('*'):
 if f.is_file() and str(f.relative_to(schema)) not in keep:
  removed.append((str(f.relative_to(schema)),hashlib.sha256(f.read_bytes()).hexdigest()));f.unlink()
for d in sorted([x for x in schema.rglob('*') if x.is_dir()],key=lambda x:len(x.parts),reverse=True):
 try:d.rmdir()
 except OSError:pass
report={'commit':'41716d7b52278faecd446539a8aa1814aeb0dd47','modelRequests':0,'identities':identities,'staticInspection':{'classification':'inspectNativePayload, not native discovery','payloads':len(static),'exactExpectedPublicNames':all(x.get('matches') for x in static),'file':'static-payloads.json'},'codex':{'classification':'native source marketplace plugin/read; source skills/list activation not proved','raw':'codex-native-source-corrected.json','marketplacePath':'/github/skills/codex/.agents/plugins/marketplace.json','sourceSkillCount':len(sourceSkills),'allPathsFromSource':all(x['path'].startswith('/github/skills/codex/plugins/') for x in sourceSkills),'counts':{p['summary']['name']:len(p['skills']) for p in plugins},'confounds':['plugin/read summary.installed=true reflects existing user registrations; this run did not install or register anything','skills/list cwds are source package roots, but all returned QS skills originate from installed caches, not source roots'],'skillsListSourcePathMatches':sum(s['path'].startswith('/github/skills/codex/plugins/') for d in installed for s in d['skills']),'initialRefusalRaw':'codex-native-source.json','incorrectMarketplaceDirectoryAttemptRaw':'codex-native-source-normal.json'},'claude':{'classification':'native transient source plugin loading proved by CLI loader debug plus initialization command enumeration','raw':'claude-debug.json','control':'claude-control.json','sourceDebug':'claude-native-loader.debug','sourceSkillPaths':sourcePaths,'sourcePathCount':len(sourcePaths),'sourceOverridesInstalled':sorted(overrides),'nativeCommandNamesAddedVersusInstalledControl':sorted(bn-an),'nativeCommandNamesRemovedVersusInstalledControl':sorted(an-bn),'confound':'Initial command-name comparison alone added no names because all 39 were already installed. Native debug independently proves source package precedence and source skill loading. This is not installed-host source-version acceptance.'},'pi':{'classification':'installed native SDK source loader only; no successful native CLI enumeration','sdkRaw':'pi-native-loader.json','cliRefusalRaw':'pi-native-source.json','sdkCounts':{r['collection']:len(r['actual']) for r in pi['results']},'sdkAllNamesMatch':all(r['matches'] for r in pi['results']),'sdkDiagnosticCount':sum(len(r['result']['diagnostics']) for r in pi['results']),'blocker':'Native CLI attempts a real-user trust.json.lock before get_commands and is blocked by EROFS. No trust bypass, home redirection or settings edit was attempted.'},'controlHashComparisons':controls,'limitations':['Discovery proves public enumeration only; private dependency runtime closure remains separately unverified.','Private helpers absent from public enumeration is supported by exact catalog name sets, not helper execution.','No installed-host migration/activation or model routing proved.','Hash snapshots start only at named before-* points; no retroactive pre-initial-probe snapshot claimed.'],'schemaRetention':{'kept':sorted(keep),'removedGeneratedFiles':len(removed),'removedGeneratedPathHashesAggregateSha256':hashlib.sha256(json.dumps(sorted(removed)).encode()).hexdigest()}}
(P/'assessment.json').write_text(json.dumps(report,indent=2)+'\n')
manifest=[]
for f in sorted(P.rglob('*')):
 if f.is_file() and f.name!='manifest.json':manifest.append({'path':str(f.relative_to(P)),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(P/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'codexSourceSkills':len(sourceSkills),'claudeSourcePaths':len(sourcePaths),'claudeSourceOverrideCount':len(overrides),'controlHashesIdentical':all(c['identical'] for c in controls),'evidenceFiles':len(manifest)},indent=2))
