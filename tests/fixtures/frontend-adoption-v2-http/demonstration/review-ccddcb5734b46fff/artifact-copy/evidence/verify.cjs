const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(root + '/') || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', {'.html':'text/html', '.css':'text/css', '.js':'text/javascript'}[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
(async () => {
  let browser;
  const results = { viewports: [], errors: [], externalRequests: [] };
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = await puppeteer.launch({executablePath:'/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell', headless:true, args:['--no-sandbox', '--disable-background-networking']});
    const page = await browser.newPage();
    page.on('pageerror', e => results.errors.push(e.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (!request.url().startsWith(base)) { results.externalRequests.push(request.url()); request.abort(); }
      else request.continue();
    });
    for (const [width, height, name] of [[1280,900,'wide'],[390,844,'narrow']]) {
      await page.setViewport({width,height});
      await page.goto(base, {waitUntil:'load'});
      await page.screenshot({path:path.join(__dirname, `${name}.png`), fullPage:true});
      const layout = await page.evaluate(() => ({ overflow:document.documentElement.scrollWidth > innerWidth, title:document.querySelector('h1').textContent, brandFont:getComputedStyle(document.body).fontFamily }));
      await page.keyboard.press('Tab');
      const skip = await page.evaluate(() => document.activeElement.textContent);
      await page.keyboard.press('Enter');
      await page.focus('#member-email');
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => document.activeElement.id);
      await page.keyboard.press('Enter');
      const emptyEvents = await page.evaluate(() => window.__events.length);
      await page.type('#member-email', 'invalid');
      await page.click('#join-button');
      const invalidEvents = await page.evaluate(() => window.__events.length);
      await page.$eval('#member-email', el => {el.value = '';});
      await page.type('#member-email', 'family@example.com');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      const submission = await page.evaluate(() => ({message:document.querySelector('#form-message').textContent, events:window.__events, url:location.pathname}));
      results.viewports.push({width,height, ...layout, skip, focus, emptyEvents, invalidEvents, submission});
      if (layout.overflow || focus !== 'join-button' || emptyEvents || invalidEvents || submission.events.length !== 1 || submission.message !== 'Ready to continue with Family membership.') throw new Error('Verification failed at '+width);
    }
    await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}, {name:'prefers-reduced-motion',value:'reduce'}]);
    await page.screenshot({path:path.join(__dirname,'narrow-dark.png'),fullPage:true});
    results.darkMode = await page.evaluate(() => ({background:getComputedStyle(document.body).backgroundColor, ink:getComputedStyle(document.body).color, overflow:document.documentElement.scrollWidth>innerWidth}));
    results.routes = [];
    for (const route of ['/membership/family', '/privacy', '/accessibility']) {
      const response = await page.goto(base+route);
      results.routes.push({route, status:response.status(), title:await page.$eval('h1',el=>el.textContent)});
    }
    fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify(results,null,2));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error);process.exitCode=1;});
