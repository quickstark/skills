import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COLLECTION_REGISTRY,
  PUBLIC_COMMANDS,
  resolvePublicCommand,
  resolvePrimaryHelpRoute,
  validateSkillCollectionRegistryModel,
} from '../scripts/skill-collection-registry.mjs';
import {
  renderHelpRoutingReference,
  renderSkillOutputContract,
  renderDocumentationOutputContract,
} from '../scripts/sync-skill-output-contracts.mjs';

const observed = {
  codex: ['$qs-skills:qs-code-build', '$qs-specialists:qs-deploy-prompt', '$ps-skills:ps-visual-parity'],
  claude: ['/qs-code-build', '/qs-deploy-prompt', '/ps-visual-parity'],
  pi: ['/skill:qs-code-build', '/skill:qs-deploy-prompt', '/skill:ps-visual-parity'],
};
const destinations = ['qs-code-build', 'qs-deploy-prompt', 'ps-visual-parity'];

test('primary Help reaches build, prompt generation and parity with independently expected host literals', () => {
  const ordinaryRoutes = resolvePublicCommand('qs-help').continuation.normal.map(({ name }) => name);
  for (const [index, name] of destinations.entries()) {
    assert.ok(!ordinaryRoutes.includes(name), `${name} is the primary-routing regression case`);
    for (const harness of Object.keys(observed)) {
      const result = resolvePrimaryHelpRoute(name, { harness, availableLiterals: observed[harness] });
      assert.equal(result.status, 'ready');
      assert.equal(result.literal, observed[harness][index]);
      assert.equal(result.name, name);
      assert.ok(!Object.hasOwn(result, 'prerequisite'));
    }
  }
});

test('all registered public roots can be selected only when their exact host literal is observed', () => {
  for (const command of PUBLIC_COMMANDS) {
    for (const [harness, literal] of [
      ['codex', command.codexLiteral],
      ['claude', command.claudeLiteral],
      ['pi', `/skill:${command.name}`],
    ]) {
      const availableLiterals = [literal, '/unrelated-vendor-command'];
      const before = [...availableLiterals];
      const result = resolvePrimaryHelpRoute(command.name, { harness, availableLiterals });
      assert.equal(result.literal, literal);
      assert.equal(result.collectionId, command.collectionId);
      assert.deepEqual(availableLiterals, before, 'routing must not mutate discovery evidence');
      assert.ok(Object.isFrozen(result));
      const unavailable = resolvePrimaryHelpRoute(command.name, { harness, availableLiterals: [] });
      assert.equal(unavailable.status, 'input-required');
      assert.ok(!Object.hasOwn(unavailable, 'literal'));
      assert.ok(unavailable.prerequisite.includes(command.collectionId));
      assert.ok(!unavailable.prerequisite.includes(literal), 'missing target has no executable literal');
    }
  }
});

test('package presence, a wrong host, an old alias or unverified availability cannot fabricate an executable route', () => {
  for (const availableLiterals of [
    [], ['qs-specialists'], ['qs-deploy-prompt'],
    ['$other-package:qs-deploy-prompt'], ['/qs-deploy-prompt'],
    ['$qs-specialists:deploy-prompt'],
  ]) {
    const result = resolvePrimaryHelpRoute('qs-deploy-prompt', { availableLiterals });
    assert.equal(result.status, 'input-required');
    assert.match(result.prerequisite, /qs-specialists/);
    assert.match(result.prerequisite, /verify discovery/);
    assert.ok(!Object.hasOwn(result, 'literal'));
  }
  assert.equal(resolvePrimaryHelpRoute('ps-visual-parity').status, 'input-required');
});

test('unknown destinations and malformed discovery fail without a fallback or inferred installation', () => {
  assert.throws(() => resolvePrimaryHelpRoute('qs-not-registered'), /unknown public command/);
  for (const harness of ['unknown', '__proto__', 'constructor', null]) {
    assert.throws(() => resolvePrimaryHelpRoute('qs-code-build', { harness }), /Unsupported primary Help routing harness/);
  }
  for (const availableLiterals of [null, {}, 'all', [42], [''], [' /qs-code-build']]) {
    assert.throws(() => resolvePrimaryHelpRoute('qs-code-build', { availableLiterals }), /exact observed host literals/);
  }
});

test('primary routing policy cannot be broadened into automatic invocation or ordinary root ownership', () => {
  const before = structuredClone(COLLECTION_REGISTRY);
  assert.equal(validateSkillCollectionRegistryModel(before), true);
  for (const mutate of [
    (model) => { delete model.publicCommands.find(({ name }) => name === 'qs-help').primaryRouting; },
    (model) => { model.publicCommands.find(({ name }) => name === 'qs-help').primaryRouting.automaticInvocation = true; },
    (model) => { model.publicCommands.find(({ name }) => name === 'qs-help').primaryRouting.availability = 'package-name'; },
    (model) => { model.publicCommands.find(({ name }) => name === 'qs-code-build').primaryRouting = before.publicCommands.find(({ name }) => name === 'qs-help').primaryRouting; },
  ]) {
    const invalid = structuredClone(COLLECTION_REGISTRY);
    mutate(invalid);
    assert.throws(() => validateSkillCollectionRegistryModel(invalid), /primary Help routing|primary routing/);
  }
  assert.deepEqual(COLLECTION_REGISTRY, before);
});

test('private routing metadata has exactly the registered public destinations and all three harness literals', () => {
  const text = renderHelpRoutingReference();
  assert.equal(text, renderHelpRoutingReference(), 'generation must be deterministic');
  assert.doesNotMatch(text, /^---\nname:/);
  const rows = text.split('\n').filter((line) => line.startsWith('| ') && !line.startsWith('| Command') && !line.startsWith('| ---'));
  const names = rows.map((row) => row.split('|')[1].trim());
  assert.deepEqual(names, PUBLIC_COMMANDS.map(({ name }) => name));
  assert.equal(new Set(names).size, names.length);
  for (const [index, command] of PUBLIC_COMMANDS.entries()) {
    assert.ok(rows[index].includes(command.codexLiteral));
    assert.ok(rows[index].includes(command.claudeLiteral));
    assert.ok(rows[index].includes(`/skill:${command.name}`));
  }
  assert.match(text, /not a command or proof of installation/);
  assert.match(text, /Never import another public skill body/);
  assert.doesNotMatch(text, /```text/);
});

test('only Help selects private primary metadata; ordinary continuations and one-result policy remain separate', () => {
  for (const command of PUBLIC_COMMANDS) {
    const contract = renderSkillOutputContract(command);
    const documentation = renderDocumentationOutputContract(command);
    if (command.name === 'qs-help') {
      assert.match(contract, /Read \[ROUTING\.md\]\(ROUTING\.md\)/);
      assert.match(contract, /separate from ordinary continuation eligibility/);
      assert.match(contract, /Input required.*no executable prompt/);
      assert.match(contract, /exactly one fenced `text` block/);
      assert.match(documentation, /Primary Help routing may select any registered public root/);
      assert.doesNotMatch(contract, /Eligible next routes:/);
    } else {
      assert.doesNotMatch(contract, /ROUTING\.md|Primary Help routing/);
      assert.doesNotMatch(documentation, /Primary Help routing/);
    }
  }
  assert.deepEqual(resolvePublicCommand('qs-help').continuation.normal.map(({ name }) => name), [
    'qs-plan-clarify', 'qs-flow-triage', 'qs-setup',
  ]);
});
