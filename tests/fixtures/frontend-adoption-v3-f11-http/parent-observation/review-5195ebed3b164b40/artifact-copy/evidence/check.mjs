import puppeteer from '/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const browser = await puppeteer.launch({ executablePath: '/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--no-sandbox'], });
const observations = { errors: [], viewports: [] };
try {
  const page = await browser.newPage();
  page.on('pageerror', error => observations.errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => request.url().startsWith('file:') ? request.continue() : request.abort());
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewport(viewport);
    await page.goto('file:///tmp/qs-frontend-v3-task-Zz9Py3/index.html');
    await page.screenshot({ path: `evidence/${viewport.width}.png`, fullPage: true });
    observations.viewports.push(await page.evaluate(() => ({width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, panel: document.querySelector('#membership-panel').getBoundingClientRect().toJSON(), headline: document.querySelector('h1').getBoundingClientRect().toJSON()})));
  }
  await page.keyboard.press('Tab');
  observations.firstTab = await page.evaluate(() => document.activeElement.textContent);
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
  observations.ctaKeyboardFocused = await page.evaluate(() => document.activeElement.id === 'join-button');
  await page.keyboard.press('Enter');
  observations.dialogOpen = await page.$eval('#join-dialog', el => el.open);
  observations.emailFocused = await page.evaluate(() => document.activeElement.id === 'member-email');
  await page.click('button[type="submit"]');
  observations.emptyRejected = await page.evaluate(() => !document.querySelector('#member-email').validity.valid && window.__events.length === 0);
  await page.type('#member-email', 'invalid');
  await page.click('button[type="submit"]');
  observations.invalidRejected = await page.evaluate(() => !document.querySelector('#member-email').validity.valid && window.__events.length === 0);
  await page.$eval('#member-email', el => { el.value = ''; });
  await page.type('#member-email', 'visitor@example.com');
  await page.keyboard.press('Enter');
  observations.confirmation = await page.$eval('#form-message', el => el.textContent);
  observations.events = await page.evaluate(() => window.__events);
  await page.screenshot({path: 'evidence/membership-confirmation.png', fullPage: true});
  await page.keyboard.press('Escape');
  observations.escapeClosed = await page.$eval('#join-dialog', el => !el.open);
  observations.focusReturned = await page.evaluate(() => document.activeElement.id === 'join-button');
  observations.referenceHash = createHash('sha256').update(await readFile('reference.png')).digest('hex');
  observations.referenceUnchanged = observations.referenceHash === '944a6a0bb1241d727501267db091e578c05ef73b38f709731363b10ef0023786';
  await writeFile('evidence/observations.json', JSON.stringify(observations, null, 2));
  console.log(JSON.stringify(observations, null, 2));
} finally { await browser.close(); }
