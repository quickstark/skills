const puppeteer = require('/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await puppeteer.launch({executablePath:'/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox','--disable-background-networking']});
  try {
    const page = await browser.newPage();
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().startsWith('file:') || request.url().startsWith('data:')) request.continue();
      else { external.push(request.url()); request.abort(); }
    });
    await page.setViewport({width:1280,height:900});
    await page.goto('file://' + path.join(__dirname,'index.html'));
    const ids = ['site-header','site-footer','membership-panel','membership-title','price','member-count','annual-visits','founded','join-form','member-email','join-button','form-message','details-link'];
    for (const id of ids) assert.equal(await page.$$eval('#'+id, nodes => nodes.length),1,id);
    const facts = await page.evaluate(() => ({ title:document.querySelector('h1').textContent,price:document.querySelector('#price').textContent,members:document.querySelector('#member-count').textContent,visits:document.querySelector('#annual-visits').textContent,founded:document.querySelector('#founded').textContent,background:getComputedStyle(document.body).backgroundColor,font:getComputedStyle(document.body).fontFamily,panel:getComputedStyle(document.querySelector('#membership-panel')).backgroundColor,details:document.querySelector('#details-link').getAttribute('href'),action:document.querySelector('form').getAttribute('action') }));
    assert.equal(facts.title,'Make room for wonder.');
    assert.equal(facts.price,'$100 / year');
    assert.equal(facts.members,'10,000'); assert.equal(facts.visits,'50,000'); assert.equal(facts.founded,'2020');
    assert.equal(facts.background,'rgb(247, 245, 239)'); assert.equal(facts.panel,'rgb(8, 107, 100)'); assert.match(facts.font,/Georgia/);
    assert.equal(facts.details,'/membership/family'); assert.equal(facts.action,'/join/checkout?plan=family');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className),'skip-link');
    await page.keyboard.press('Enter');
    await page.focus('#member-email');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id),'join-button');
    assert.equal(await page.$eval('#join-button', e => getComputedStyle(e).outlineStyle),'solid');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.__events.length),0);
    await page.type('#member-email','invalid');
    await page.click('#join-button');
    assert.equal(await page.evaluate(() => window.__events.length),0);
    await page.$eval('#member-email', e => e.value = '');
    await page.type('#member-email','member@example.com');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#form-message', e => e.textContent),'Ready to continue with Family membership.');
    assert.deepEqual(await page.evaluate(() => window.__events),[{name:'join_started',plan:'family'}]);
    assert.ok(page.url().startsWith('file:'));
    await page.screenshot({path:path.join(__dirname,'evidence/wide-confirmation.png'),fullPage:true});
    await page.reload();
    await page.screenshot({path:path.join(__dirname,'evidence/wide.png'),fullPage:true});
    for (const width of [1280,390,320]) {
      await page.setViewport({width,height:width===1280?900:844});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true,'overflow at '+width);
      if (width===390) await page.screenshot({path:path.join(__dirname,'evidence/narrow.png'),fullPage:true});
    }
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),true);
    assert.equal(await page.$eval('button',e => getComputedStyle(e).animationName),'none');
    assert.deepEqual(errors,[]); assert.deepEqual(external,[]);
    console.log('PASS: sections, stable IDs, exact facts, brand, routes, required/invalid email rejection, keyboard submission and focus, confirmation, analytics, no navigation, 1280/390/320 overflow, reduced motion, no browser errors or external requests. Screenshots: evidence/wide.png, evidence/narrow.png, evidence/wide-confirmation.png.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
