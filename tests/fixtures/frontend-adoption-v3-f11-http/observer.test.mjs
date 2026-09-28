import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshot, serveSnapshot, observeHttp } from './observer.mjs';

async function fixture(t) { const root = await mkdtemp(join(tmpdir(), 'qs-f11-observer-control-')); t.after(() => rm(root, { recursive: true, force: true })); return root; }
async function product(base, kind, external = '') {
  const root = join(base, 'product'); await mkdir(root);
  const dialog = kind !== 'inline';
  const opener = kind === 'inaccessible' ? '<div id="join-button" aria-haspopup="dialog">Open membership</div>' : '<button id="join-button" type="button" aria-haspopup="dialog">Open membership</button>';
  const form = `<form id="join-form"><label for="member-email">Email</label><input id="member-email" type="email" required><button ${dialog ? '' : 'id="join-button"'} type="submit">Continue</button><p id="form-message" role="status"></p></form>`;
  await writeFile(join(root, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><script defer src="/script.js"></script></head><body><header id="site-header">Northstar</header><main><h1>Membership</h1>${dialog ? opener + '<dialog id="membership-dialog"><button type="button" id="close-button">Close</button>' + form + '</dialog>' : form}</main><footer id="site-footer">Museum</footer></body></html>`);
  await writeFile(join(root, 'style.css'), 'body{font-family:Georgia,serif;background:#f7f5ef;color:#182d2a;margin:24px}dialog{max-width:calc(100vw - 64px);border-radius:12px}input,button{font:inherit;margin:8px;padding:12px}:focus-visible{outline:3px solid #086b64}');
  await writeFile(join(root, 'script.js'), `window.__events=[];const form=document.querySelector('#join-form');form.addEventListener('submit',e=>{e.preventDefault();window.__events.push({name:'join_started',plan:'family'});document.querySelector('#form-message').textContent='Ready to continue with Family membership.';});${dialog ? `const dialog=document.querySelector('dialog');${kind === 'broken' ? '' : `document.querySelector('#join-button').addEventListener('click',()=>{dialog.showModal();document.querySelector('#member-email').focus();});`}document.querySelector('#close-button').onclick=()=>dialog.close();` : ''}${external ? `fetch('${external}/fetch').catch(()=>{});new Worker('/worker.js');new WebSocket('${external.replace('http:', 'ws:')}/socket');` : ''}`);
  if (external) await writeFile(join(root, 'worker.js'), `fetch('${external}/worker-fetch').catch(()=>{});`);
  return root;
}
for (const kind of ['inline', 'dialog', 'inaccessible', 'broken']) {
  test(`real browser ${kind}: actual keyboard/form behavior, both widths, immutable artifacts`, async t => {
    const base = await fixture(t), project = await product(base, kind), output = join(base, 'observed');
    const before = (await snapshot(project)).manifest;
    const { report, evidence } = await observeHttp({ project, output });
    assert.equal(evidence.unchanged, true); assert.deepEqual(before, evidence.copyAfter); assert.deepEqual(before, (await snapshot(project)).manifest);
    assert.equal(report.qualityJudgment, 'Not evaluated; independent review required.');
    for (const name of ['wide', 'narrow']) {
      const interaction = report.interactions[name];
      assert.ok((await readFile(join(output, 'browser', name + '.png'))).length > 100);
      if (['inaccessible', 'broken'].includes(kind)) {
        assert.equal(interaction.status, 'failed'); assert.equal(interaction.validAfter, undefined);
        assert.match(interaction.reason, kind === 'inaccessible' ? /not keyboard reachable/ : /did not expose/);
        assert.equal(interaction.initial.dialog.open, false);
        if (kind === 'broken') assert.equal(interaction.opened.dialog.open, false);
        continue;
      }
      assert.equal(interaction.status, 'observed', JSON.stringify(interaction));
      assert.equal(interaction.invalidBefore.email.valid, false); assert.deepEqual(interaction.invalidAfter.events, []);
      assert.equal(interaction.validBefore.email.valid, true); assert.deepEqual(interaction.validAfter.events, [{ name: 'join_started', plan: 'family' }]);
      assert.equal(interaction.validAfter.message, 'Ready to continue with Family membership.');
      assert.equal(interaction.steps.validSubmit.state.focus.onSubmit, true);
      if (kind === 'dialog') {
        assert.equal(interaction.steps.opener.reached, true); assert.equal(interaction.opened.dialog.modal, true);
        assert.equal(interaction.steps.validSubmit.state.focus.id, '', 'Actual unnamed submit is used, not opener ID.');
        assert.equal(interaction.escapeClosed, true); assert.equal(interaction.escapeReturnedFocus, true);
        assert.equal(interaction.dialogFocusSequence.length, 16); assert.ok(interaction.dialogFocusSequence.some(x => x.insideDialog));
      }
    }
    assert.deepEqual(report.views.wide.viewport, { width: 1280, height: 900 });
    assert.deepEqual(report.views.narrow.viewport, { width: 390, height: 844 });
    assert.equal(report.tabSequence.length, 14); assert.equal(report.reducedMotion.matches, true);
  });
}
test('unchanged confinement blocks page/worker/WebSocket attempts; local sentinel gets zero hits', async t => {
  const base = await fixture(t); let hits = 0;
  const server = createServer((req, res) => { hits++; res.end(); }); server.on('upgrade', (req, socket) => { hits++; socket.destroy(); });
  await new Promise(done => server.listen(0, '127.0.0.1', done)); t.after(() => new Promise(done => server.close(done)));
  const origin = `http://127.0.0.1:${server.address().port}`, project = await product(base, 'dialog', origin);
  const { report, evidence } = await observeHttp({ project, output: join(base, 'observed') });
  assert.equal(hits, 0); assert.ok(report.blockedRequests.includes(origin + '/fetch'));
  assert.ok(evidence.deniedProxyRequests.some(x => x.url.includes(String(server.address().port))));
  assert.equal(report.interactions.narrow.status, 'observed'); assert.equal(evidence.unchanged, true);
});
test('launch failure retains evidence and original bytes; nested output and symlink source rejected', async t => {
  const base = await fixture(t), project = await product(base, 'inline'), before = (await snapshot(project)).manifest, output = join(base, 'failed');
  await assert.rejects(observeHttp({ project, output, browser: join(base, 'absent-browser') }), /Browser was not found|launch|executable|ENOENT/);
  const evidence = JSON.parse(await readFile(join(output, 'transport-evidence.json')));
  assert.ok(evidence.failure); assert.equal(evidence.reportComplete, false); assert.equal(evidence.unchanged, true); assert.deepEqual(before, evidence.sourceAfter);
  await assert.rejects(observeHttp({ project, output: join(project, 'nested') }), /disjoint/);
  await symlink(join(project, 'index.html'), join(project, 'unsafe-link'));
  await assert.rejects(snapshot(project), /symlinks/);
});
test('transport module is byte-identical; launch/confinement and base measurement slices preserved', async () => {
  assert.equal(await readFile(new URL('./observer.mjs', import.meta.url), 'utf8'), await readFile(new URL('../frontend-adoption-v2-http/observer.mjs', import.meta.url), 'utf8'));
  const original = await readFile(new URL('../frontend-adoption-v2-http/browser-observe-http.mjs', import.meta.url), 'utf8');
  const derivative = await readFile(new URL('./browser-observe-http.mjs', import.meta.url), 'utf8');
  for (const [start, end] of [["  const browser = await puppeteer.launch", "  const report ="], ["    const page =", "    for (const [name"], ["      report.views[name]", "      }));"], ["    report.tabSequence", "    const email ="], ["    await page.emulateMediaFeatures", "  } finally"]]) {
    const fragment = original.slice(original.indexOf(start), original.indexOf(end, original.indexOf(start)));
    assert.ok(fragment.length > 40); assert.ok(derivative.includes(fragment), start);
  }
  const helper = await readFile(new URL('./membership-observe.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(helper, /\.showModal\s*\(|\.requestSubmit\s*\(|\.click\s*\(|\.focus\s*\(/);
});
