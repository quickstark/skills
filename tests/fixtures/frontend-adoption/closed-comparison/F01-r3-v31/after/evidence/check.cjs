const puppeteer = require('/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',
    headless: true,
    args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--no-first-run'],
  });
  const observations = [];
  try {
    const page = await browser.newPage();
    const externalRequests = [];
    const errors = [];
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (!request.url().startsWith('file:')) {
        externalRequests.push(request.url());
        return request.abort();
      }
      return request.continue();
    });
    page.on('pageerror', error => errors.push(error.message));
    for (const [name, width, height, theme] of [
      ['wide-light', 1280, 900, 'light'],
      ['narrow-light', 390, 844, 'light'],
      ['wide-dark', 1280, 900, 'dark'],
      ['narrow-dark', 390, 844, 'dark'],
    ]) {
      await page.setViewport({ width, height });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.goto('file://' + path.resolve('index.html'));
      const layout = await page.evaluate(() => {
        const rect = selector => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom };
        };
        return {
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          header: rect('#site-header'),
          introduction: rect('.introduction'),
          button: rect('#join-button'),
          detailsHref: document.querySelector('#details-link').getAttribute('href'),
          background: getComputedStyle(document.body).backgroundColor,
          tokens: ['--paper', '--ink', '--accent', '--panel', '--muted', '--field', '--button-text', '--error'].reduce((out, token) => ({ ...out, [token]: getComputedStyle(document.documentElement).getPropertyValue(token).trim() }), {}),
          hasForbiddenDashes: /[\u2013\u2014]/.test(document.body.innerText),
        };
      });
      assert.equal(layout.pageWidth, width, 'No horizontal overflow');
      assert.equal(layout.detailsHref, '/membership/family');
      assert.ok(layout.header.height <= 80);
      assert.equal(layout.hasForbiddenDashes, false);
      if (width === 1280) assert.ok(layout.button.bottom < height, 'Desktop form CTA visible');
      await page.screenshot({ path: `evidence/${name}.png`, fullPage: true });
      observations.push({ name, ...layout });
    }
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Skip to content');
    await page.keyboard.press('Enter');
    await page.focus('#join-button');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'member-email');
    assert.equal(await page.$eval('#email-error', el => el.textContent), 'Enter your email address to continue.');
    assert.equal(await page.evaluate(() => (window.__events || []).length), 0);
    await page.type('#member-email', 'invalid');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#member-email', el => el.getAttribute('aria-invalid')), 'true');
    assert.equal(await page.evaluate(() => (window.__events || []).length), 0);
    await page.$eval('#member-email', el => { el.value = ''; });
    await page.type('#member-email', 'family@example.com');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#form-message', el => el.textContent), 'Ready to continue with Family membership.');
    assert.deepEqual(await page.evaluate(() => window.__events), [{ name: 'join_started', plan: 'family' }]);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'form-message');
    assert.equal(externalRequests.length, 0);
    assert.equal(errors.length, 0);
    await page.screenshot({ path: 'evidence/narrow-confirmation.png', fullPage: true });
    fs.writeFileSync('evidence/browser-observations.json', JSON.stringify({ observations, checks: { keyboard: 'passed', emptyEmail: 'passed', invalidEmail: 'passed', validEmail: 'passed', analyticsPayload: 'passed', localOnly: 'passed' }, externalRequests, errors }, null, 2));
    console.log('Passed: four responsive/theme layouts, keyboard, email validation, confirmation, analytics; no external page requests or runtime errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
