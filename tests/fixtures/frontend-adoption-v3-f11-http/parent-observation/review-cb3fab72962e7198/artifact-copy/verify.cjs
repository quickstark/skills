const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const puppeteer = require('/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');

(async () => {
  const root = __dirname;
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!['index.html', 'styles.css', 'script.js'].includes(file)) {
      res.writeHead(404); res.end('Not found'); return;
    }
    res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'text/html');
    res.end(fs.readFileSync(path.join(root, file)));
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await puppeteer.launch({executablePath: '/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', req => req.url().startsWith('http://127.0.0.1:') ? req.continue() : req.abort());
    await page.setViewport({width: 1280, height: 900});
    await page.goto(`http://127.0.0.1:${server.address().port}/`, {waitUntil: 'networkidle0'});
    fs.mkdirSync(path.join(root, 'evidence'), {recursive: true});
    const observations = {};
    for (const [name, width, height] of [['wide',1280,900], ['narrow',390,844]]) {
      await page.setViewport({width, height});
      await page.screenshot({path: path.join(root, 'evidence', `${name}.png`), fullPage: true});
      observations[name] = await page.evaluate(() => {
        const panel = document.querySelector('#membership-panel');
        const rect = panel.getBoundingClientRect();
        return {viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, panel: {x:rect.x,y:rect.y,width:rect.width,height:rect.height}, font:getComputedStyle(document.body).fontFamily, buttonRadius:getComputedStyle(document.querySelector('#continue-button')).borderRadius};
      });
      assert.equal(observations[name].scrollWidth, width, 'No horizontal overflow');
      assert.equal(observations[name].buttonRadius, '12px');
      assert.match(observations[name].font, /Georgia/);
    }
    await page.setViewport({width:1280,height:900});
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'wordmark');
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'continue-button');
    assert.notEqual(await page.$eval('#continue-button', el => getComputedStyle(el).outlineStyle), 'none');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'member-email');
    await page.click('#join-button');
    assert.equal(await page.evaluate(() => window.__events.length), 0);
    await page.type('#member-email', 'invalid');
    await page.click('#join-button');
    assert.equal(await page.evaluate(() => window.__events.length), 0);
    await page.$eval('#member-email', el => { el.value = ''; });
    await page.type('#member-email', 'member@example.com');
    await page.click('#join-button');
    assert.equal(await page.$eval('#form-message', el => el.textContent), 'Ready to continue with Family membership.');
    assert.deepEqual(await page.evaluate(() => window.__events), [{name:'join_started',plan:'family'}]);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'continue-button');
    await page.setViewport({width:390,height:844});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.click('#continue-button');
    await page.screenshot({path:path.join(root,'evidence','narrow-form.png'),fullPage:true});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth),390);
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, []);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'reference.png'))).digest('hex'),'944a6a0bb1241d727501267db091e578c05ef73b38f709731363b10ef0023786');
    console.log(JSON.stringify({passed:true,observations,checks:['reference unchanged','wide and narrow screenshots','no horizontal overflow','brand styles','keyboard opening and focus return','visible focus','required and invalid email blocked','valid submit confirmation and analytics','reduced motion form usable','no JavaScript errors']},null,2));
  } finally {
    if(browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error);process.exitCode=1;});
