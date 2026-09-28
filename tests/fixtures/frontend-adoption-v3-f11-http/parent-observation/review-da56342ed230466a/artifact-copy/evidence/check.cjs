const puppeteer = require('/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    const externalRequests = [];
    const errors = [];
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (/^https?:/.test(request.url())) { externalRequests.push(request.url()); request.abort(); }
      else request.continue();
    });
    page.on('pageerror', error => errors.push(error.message));
    const results = [];
    for (const [width, height, name] of [[1280, 900, 'wide'], [390, 844, 'narrow']]) {
      await page.setViewport({ width, height });
      await page.goto('file://' + path.resolve('index.html'));
      await page.screenshot({ path: `evidence/${name}.png`, fullPage: true });
      const layout = await page.evaluate(() => {
        const rect = document.querySelector('#membership-panel').getBoundingClientRect();
        return { viewportWidth: innerWidth, pageWidth: document.documentElement.scrollWidth, panel: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
      });
      assert.equal(layout.pageWidth, width, 'No horizontal overflow');
      await page.focus('#join-button');
      await page.keyboard.press('Enter');
      assert.equal(await page.$eval('#member-email', el => el === document.activeElement), true);
      await page.click('#continue-button');
      assert.equal(await page.evaluate(() => window.__events.length), 0);
      await page.type('#member-email', 'invalid');
      await page.click('#continue-button');
      assert.equal(await page.evaluate(() => window.__events.length), 0);
      await page.$eval('#member-email', el => { el.value = ''; });
      await page.type('#member-email', 'family@example.com');
      await page.keyboard.press('Enter');
      assert.deepEqual(await page.evaluate(() => window.__events), [{ name: 'join_started', plan: 'family' }]);
      assert.equal(await page.$eval('#form-message', el => el.textContent), 'Ready to continue with Family membership.');
      await page.screenshot({ path: `evidence/${name}-form.png`, fullPage: true });
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#membership-dialog', el => el.open), false);
      assert.equal(await page.$eval('#join-button', el => el === document.activeElement), true);
      results.push({ name, ...layout, keyboardAndForm: 'passed: Enter opens, email focus, empty/invalid rejected, valid confirms and records exact event, Escape closes and restores focus' });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, []);
    fs.writeFileSync('evidence/browser-results.json', JSON.stringify({ results, errors, externalRequests }, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
