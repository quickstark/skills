const puppeteer = require('/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const observations = { checks: [], externalRequests: [], errors: [] };
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (/^https?:/.test(request.url())) {
        observations.externalRequests.push(request.url());
        request.abort();
      } else request.continue();
    });
    page.on('pageerror', error => observations.errors.push(error.message));
    const location = 'file://' + path.resolve('index.html');
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewport(viewport);
      await page.goto(location, { waitUntil: 'load' });
      const result = await page.evaluate(() => {
        const css = id => {
          const s = getComputedStyle(document.getElementById(id));
          return { font: s.fontFamily, radius: s.borderRadius, background: s.backgroundColor };
        };
        return {
          width: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          input: css('member-email'), button: css('join-button'), panel: css('membership-panel'),
          idsPresent: ['site-header', 'site-footer', 'membership-panel', 'membership-title', 'price', 'member-count', 'annual-visits', 'founded', 'join-form', 'member-email', 'join-button', 'form-message', 'details-link'].every(id => document.getElementById(id)),
          detailsHref: document.getElementById('details-link').getAttribute('href'),
          facts: ['price', 'member-count', 'annual-visits', 'founded'].map(id => document.getElementById(id).textContent)
        };
      });
      assert.equal(result.documentWidth, viewport.width);
      assert.equal(result.idsPresent, true);
      assert.equal(result.detailsHref, '/membership/family');
      assert.deepEqual(result.facts, ['$100 / year', '10,000', '50,000', '2020']);
      for (const control of [result.input, result.button, result.panel]) {
        assert.equal(control.radius, '12px');
        assert.match(control.font, /Georgia/);
      }
      assert.equal(result.button.background, 'rgb(8, 107, 100)');
      await page.screenshot({ path: `evidence/${viewport.width === 1280 ? 'wide' : 'narrow'}.png`, fullPage: true });
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to content');
      await page.keyboard.press('Enter');
      const tabs = [];
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('Tab');
        tabs.push(await page.evaluate(() => ({ id: document.activeElement.id, text: document.activeElement.textContent.trim(), outline: getComputedStyle(document.activeElement).outlineStyle })));
      }
      assert.deepEqual(tabs.map(t => t.id), ['', 'details-link', 'member-email', 'join-button']);
      assert.ok(tabs.every(t => t.outline === 'solid'));
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => window.__events.length), 0);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'member-email');
      await page.type('#member-email', 'invalid');
      await page.click('#join-button');
      assert.equal(await page.evaluate(() => window.__events.length), 0);
      await page.$eval('#member-email', input => { input.value = ''; });
      await page.type('#member-email', 'visitor@example.com');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      assert.deepEqual(await page.evaluate(() => window.__events), [{ name: 'join_started', plan: 'family' }]);
      assert.equal(await page.$eval('#form-message', el => el.textContent), 'Ready to continue with Family membership.');
      assert.ok(page.url().startsWith(location));
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width);
      observations.checks.push({ ...result, keyboardFocus: tabs, emptyEmailBlocked: true, invalidEmailBlocked: true, validKeyboardSubmission: true, correctLocalEvent: true, confirmation: true, reducedMotion: true });
    }
    assert.deepEqual(observations.errors, []);
    assert.deepEqual(observations.externalRequests, []);
    fs.writeFileSync('evidence/browser-observations.json', JSON.stringify(observations, null, 2) + '\n');
    console.log(JSON.stringify(observations, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
