"""Read-only binding/coverage check. Does not assign or replace manual grades."""
import hashlib
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
index_path = root / (sys.argv[1] if len(sys.argv) > 1 else sorted(f.name for f in root.glob('index-through-*.json'))[-1])
index = json.loads(index_path.read_text())
sha = lambda data: hashlib.sha256(data).hexdigest()
canonical = lambda value: json.dumps(value, sort_keys=True, separators=(',', ':')).encode()
counts = {'files': 0, 'images': 0, 'tools': 0}
seen = set()
for entry in index['records']:
    record_path = root / entry['path']
    assert sha(record_path.read_bytes()) == entry['sha256']
    review = json.loads(record_path.read_text())
    assert review['trialId'] == entry['trialId'] and review['trialId'] not in seen
    seen.add(review['trialId'])
    bundle = Path(review['bundlePath'])
    actual = {str(f.relative_to(bundle)): {'sha256': sha(f.read_bytes()), 'bytes': f.stat().st_size}
              for f in sorted(bundle.rglob('*')) if f.is_file()}
    assert actual == review['fileBindings']
    assert sha(canonical(actual)) == review['bundleManifestSha256']
    context = json.loads((bundle / 'context.json').read_text())
    assert review['scenarioId'] == context['task']['id']
    assert [x['id'] for x in review['checks']] == context['task']['requiredChecks']
    assert set(review['dimensions']) == set(context['rubric']['dimensions'])
    for key, directory in [('inputManifest', 'input-project'), ('actualArtifactManifest', 'actual-artifacts')]:
        for name, value in context[key].items():
            assert actual[directory + '/' + name] == value
    events = [json.loads(line) for line in (bundle / 'events.jsonl').read_text().splitlines()]
    tool_items = {e['item']['id']: e['item'] for e in events if e.get('type') == 'item.completed'
                  and e['item']['type'] not in ['agent_message', 'reasoning', 'userMessage']}
    classified = review['nativeToolAuthorityReview']['classifiedItems']
    assert set(tool_items) == {x['id'] for x in classified}
    for item in classified:
        observed = events[item['eventLine'] - 1]['item']
        assert observed['id'] == item['id'] and sha(canonical(observed)) == item['itemSha256']
    assert set(review['screenshotsOpened']) <= set(actual)
    assert review['overall'] == entry['overall']
    counts['files'] += len(actual)
    counts['images'] += len(review['screenshotsOpened'])
    counts['tools'] += len(classified)
assert len(seen) == index['reviewed'] == sum(index['scenarioCounts'].values())
assert index['status'] == 'continuation-required' if index['reviewed'] < index['expected'] else True
print(json.dumps({'bindingAndCoverageCheck': 'pass', 'reviewed': len(seen), 'expected': index['expected'], **counts}))

# F09 requires actual native image payloads, not just retained filenames.
from image_bindings import bind_images
image_count = 0
for entry in index['records']:
    review = json.loads((root / entry['path']).read_text())
    assert review['scenarioId'] == 'F09'
    observed = bind_images(review['trialId'][7:])
    assert observed == review['generatedImageBindings'] and len(observed) == 2
    assert {x['target'] for x in observed} == set(review['screenshotsOpened'])
    image_count += len(observed)
assert index['scenarioCounts'] == {'F09': index['reviewed']}
print(json.dumps({'nativeImageBindings': 'pass', 'openedGeneratedImages': image_count}))
