#!/usr/bin/env python3
"""Checks prepared diagnosis artifacts without running Codex or any model."""
import hashlib, json, pathlib
root = pathlib.Path(__file__).resolve().parent
bindings = json.loads((root / 'condition-bindings.json').read_text())
body = (root / 'instruction-guidance.md').read_bytes()
assert hashlib.sha256(body).hexdigest() == bindings['guidanceUtf8Sha256']
assert b'$qs-skills:qs-flow-handoff' in body
assert '$qs-skills:qs-flow-handoff' in (root / 'condition-pasted.template.txt').read_text()
assert '$qs-skills:qs-flow-handoff' not in (root / 'condition-file.template.txt').read_text()
requests = [json.loads(line) for line in (root / 'skills-list.requests.jsonl').read_text().splitlines()]
assert [entry['method'] for entry in requests] == ['initialize', 'initialized', 'skills/list']
for artifact in root.glob('*/result.json'):
    result = json.loads(artifact.read_text())
    assert result['modelRequests'] == 0 and result['workspaceRemoved']
    assert all(entry['method'] in ['initialize', 'initialized', 'skills/list'] for entry in result['requests'])
capability = json.loads((root / 'image-capability-metadata.json').read_text())
assert any(line.split() == ['image_generation', 'stable', 'true'] for line in capability['featureLines'])
assert capability['imageGenerationThreadItem']['title'] == 'ImageGenerationThreadItem'
print('PASS: unchanged guidance binding, isolated user-text contrast, read-only request allowlist, closed attempts, and image capability metadata.')
