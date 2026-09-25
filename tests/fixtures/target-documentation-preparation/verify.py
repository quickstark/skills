from pathlib import Path
import hashlib, json, re, subprocess

root = Path(__file__).resolve().parent
repo = root.parents[2]
inventory = json.loads((root/'inventory.json').read_text())
sha = lambda b: hashlib.sha256(b).hexdigest()
assert (repo/'AGENTS.md').is_symlink()
assert (repo/'AGENTS.md').readlink().as_posix() == 'CLAUDE.md'
checked_links = 0
for record in inventory['files']:
    path = record['path']
    assert sha((repo/path).read_bytes()) == record['baseSha256'], f'Active doc drift: {path}'
    proposed = root/'proposed'/path
    assert sha(proposed.read_bytes()) == record['proposedSha256'], f'Draft drift: {path}'
    for target in re.findall(r'\]\(([^)]+)\)', proposed.read_text()):
        if target.startswith(('https:', 'http:', '#')):
            continue
        target = target.split('#', 1)[0]
        assert (repo/Path(path).parent/target).exists(), f'Unresolved link: {path}: {target}'
        checked_links += 1
    assert 'pending 66-trial' not in proposed.read_text()
assert sha((root/'target-documentation.patch').read_bytes()) == inventory['patchSha256']
subprocess.run(['git','apply','--check',str(root/'target-documentation.patch')],cwd=repo,check=True)
for path in ['README.md','docs/install-and-update-skills.md']:
    body=(root/'proposed'/path).read_text()
    assert body.index('codex plugin marketplace add ./codex') < body.index('npm run skills:plan')
changed_sources=[p for p,h in inventory['sourceBindings'].items() if sha((repo/p).read_bytes()) != h]
result={'activeDocumentsUnchanged':len(inventory['files']),'patchApplies':True,'relativeLinksResolved':checked_links,'agentsSymlinkPreserved':True,'codexBootstrapBeforeFirstPlan':True,'temporaryTrialApprovalProseExcluded':True,'sourceDriftRequiringReview':changed_sources,'noNativeOrModelOperation':True}
print(json.dumps(result,indent=2))
