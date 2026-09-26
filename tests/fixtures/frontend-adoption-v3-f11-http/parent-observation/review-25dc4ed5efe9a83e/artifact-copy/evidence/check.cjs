const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const puppeteer = require('/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await puppeteer.launch({
    executablePath: '/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const result = { viewports: [], externalRequests: [], errors: [] };
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().startsWith('file:')) request.continue();
      else { result.externalRequests.push(request.url()); request.abort(); }
    });
    page.on('pageerror', error => result.errors.push(error.message));
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewport(viewport);
      await page.goto('file://' + path.join(root, 'index.html'));
      await page.screenshot({ path: path.join(__dirname, `${viewport.width}.png`), fullPage: true });
      result.viewports.push(await page.evaluate(() => {
        const box = document.querySelector('#membership-panel').getBoundingClientRect();
        return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, panel: { x: box.x, y: box.y, width: box.width, height: box.height }, headline: document.querySelector('h1').textContent };
      }));
      await page.focus('#join-button');
      await page.keyboard.press('Enter');
      const focusedEmail = await page.evaluate(() => document.activeElement.id === 'member-email');
      await page.click('button[type="submit"]');
      const emptyRejected = await page.evaluate(() => !document.querySelector('#member-email').validity.valid && window.__events.length === 0);
      await page.type('#member-email', 'invalid');
      await page.click('button[type="submit"]');
      const invalidRejected = await page.evaluate(() => document.querySelector('#member-email').validity.typeMismatch && window.__events.length === 0);
      await page.$eval('#member-email', input => { input.value = ''; });
      await page.type('#member-email', 'member@example.test');
      await page.keyboard.press('Enter');
      const submission = await page.evaluate(() => ({ message: document.querySelector('#form-message').textContent, events: window.__events, modalOpen: document.querySelector('dialog').open }));
      await page.screenshot({ path: path.join(__dirname, `${viewport.width}-form.png`), fullPage: true });
      await page.keyboard.press('Escape');
      const keyboardClose = await page.evaluate(() => !document.querySelector('dialog').open && document.activeElement.id === 'join-button');
      Object.assign(result.viewports.at(-1), { focusedEmail, emptyRejected, invalidRejected, submission, keyboardClose });
    }
    result.referenceHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'reference.png'))).digest('hex');
    result.referenceUnchanged = result.referenceHash === '944a6a0bb1241d727501267db091e578c05ef73b38f709731363b10ef0023786';
    result.passed = result.referenceUnchanged && !result.externalRequests.length && !result.errors.length && result.viewports.every(v => v.scrollWidth === v.width && v.focusedEmail && v.emptyRejected && v.invalidRejected && v.keyboardClose && v.submission.message === 'Ready to continue with Family membership.' && JSON.stringify(v.submission.events) === '[{"name":"join_started","plan":"family"}]');
    fs.writeFileSync(path.join(__dirname, 'observations.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
