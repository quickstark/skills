"""Bind manually assigned opaque reviews; no automatic quality/authority scoring."""
import hashlib
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent
BUNDLES = Path('/tmp/qs-frontend-comparison-v3-native-20260926/reviewer-bundles')
RUBRIC = Path('/github/skills/tests/fixtures/frontend-adoption-v3/rubric.json')
sha = lambda b: hashlib.sha256(b).hexdigest()
canonical = lambda v: json.dumps(v, sort_keys=True, separators=(',', ':')).encode()

def save_review(suffix, checks, dimensions, rationales, tools, screenshots, **extra):
    trial = 'review-' + suffix
    p = BUNDLES / trial
    c = json.loads((p / 'context.json').read_text())
    assert c['task']['id'] in ['F01', 'F03', 'F04', 'F05', 'F06']
    assert c['rubric'] == json.loads(RUBRIC.read_text())
    assert [x['id'] for x in checks] == c['task']['requiredChecks']
    assert set(dimensions) == set(rationales) == set(c['rubric']['dimensions'])
    bindings = {str(f.relative_to(p)): {'sha256': sha(f.read_bytes()), 'bytes': f.stat().st_size} for f in sorted(p.rglob('*')) if f.is_file()}
    events = [json.loads(s) for s in (p / 'events.jsonl').read_text().splitlines()]
    completed = {i for i, e in enumerate(events) if e.get('type') == 'item.completed' and e['item']['type'] not in ['userMessage', 'agent_message', 'reasoning']}
    assert completed == set(tools), (completed ^ set(tools))
    items = []
    for i, classification in tools.items():
        item = events[i]['item']
        items.append({'id': item['id'], 'eventLine': i+1, 'type': item['type'], 'itemSha256': sha(canonical(item)), **classification})
    assert set(c['execution']['unclassifiedToolItems']) <= {x['id'] for x in items}
    assert set(screenshots) <= set(bindings)
    for key, directory in [('inputManifest', 'input-project'), ('actualArtifactManifest', 'actual-artifacts')]:
        for name, binding in c[key].items(): assert bindings[directory+'/'+name] == binding
    record = {'schemaVersion': 1, 'trialId': trial, 'scenarioId': c['task']['id'], 'reviewer': 'Independent /root/baseline_blind_review; not implementation author', 'bundlePath': str(p), 'fileBindings': bindings, 'bundleManifestSha256': sha(canonical(bindings)), 'bundleManifestDefinition': 'SHA256 sorted compact UTF8 JSON fileBindings; ensure_ascii=True; every file separately bound', 'rubricSha256': sha(RUBRIC.read_bytes()), 'screenshotsOpened': screenshots, 'checks': checks, 'dimensions': dimensions, 'dimensionRationales': rationales, 'nativeToolAuthorityReview': {'counting': 'Unique completed native IDs; normalized/native duplicates and deltas not extra calls; startup metadata not a service call.', 'classifiedItems': items, 'allUnclassifiedIdsResolved': True, 'itemHashDefinition': 'SHA256 normalized event.item, Python sorted compact JSON ensure_ascii=True; one-based eventLine.', 'limits': 'Shell bodies and transitive authored helpers inspected; supplied runtime dependencies treated as fixture infrastructure; not a whole-host network audit.'}, **extra}
    record['nativeToolAuthorityReview'].update(record.pop('nativeToolCounts', {}))
    with (ROOT / (trial+'.json')).open('x') as f: json.dump(record, f, indent=2); f.write('\n')
    return record

def append_index(previous, suffixes):
    index = json.loads((ROOT / previous).read_text())
    for suffix in suffixes:
        p = ROOT / ('review-'+suffix+'.json'); r = json.loads(p.read_text())
        assert not any(x['trialId'] == r['trialId'] for x in index['records'])
        index['records'].append({'trialId': r['trialId'], 'path': p.name, 'sha256': sha(p.read_bytes()), 'overall': r['overall']})
        index['scenarioCounts'][r['scenarioId']] += 1
    index['reviewed'] = len(index['records'])
    index['status'] = 'continuation-required' if index['reviewed'] < index['expected'] else 'complete-pending-parent-verification'
    name = 'index-through-%04d.json' % index['reviewed']
    with (ROOT / name).open('x') as f: json.dump(index, f, indent=2); f.write('\n')
    return name, sha((ROOT / name).read_bytes())
