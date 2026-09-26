import puppeteer from '/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const browser = await puppeteer.launch({executablePath:'/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
  const page = await browser.newPage();
  const requests = [];
  await page.setRequestInterception(true);
  page.on('request', r => { if (!r.url().startsWith('file:')) { requests.push(r.url()); r.abort(); } else r.continue(); });
  const results = {};
  for (const [name,width,height] of [['wide',1280,900],['narrow',390,844]]) {
    await page.setViewport({width,height});
    await page.goto('file:///tmp/qs-frontend-v3-task-t3FMdl/index.html');
    await page.screenshot({path:`artifacts/${name}.png`,fullPage:true});
    results[name] = await page.evaluate(() => {
      const el = document.querySelector('#membership-panel');
      const rect = el.getBoundingClientRect();
      return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,panel:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},font:getComputedStyle(el).fontFamily,radius:getComputedStyle(el).borderRadius,buttonColor:getComputedStyle(document.querySelector('#join-button')).backgroundColor};
    });
    assert.equal(results[name].scrollWidth,width);
    await page.focus('#join-button');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#member-email',el=>document.activeElement===el),true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'/privacy');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>window.__events.length),0);
    await page.type('#member-email','invalid');
    await page.click('button[type="submit"]');
    assert.equal(await page.evaluate(()=>window.__events.length),0);
    await page.$eval('#member-email',el=>el.value='');
    await page.type('#member-email','member@example.com');
    await page.click('button[type="submit"]');
    assert.deepEqual(await page.evaluate(()=>window.__events),[{name:'join_started',plan:'family'}]);
    assert.equal(await page.$eval('#form-message',el=>el.textContent),'Ready to continue with Family membership.');
    await page.screenshot({path:`artifacts/${name}-confirmation.png`,fullPage:true});
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#join-button',el=>document.activeElement===el),true);
    results[name].form = 'Empty/invalid email rejected; valid email records exact event and confirmation; keyboard opening, tab order, Escape and focus return passed.';
  }
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  results.reducedMotion = await page.evaluate(()=>({enabled:matchMedia('(prefers-reduced-motion: reduce)').matches,animations:document.getAnimations().length}));
  assert.equal(results.reducedMotion.animations,0);
  assert.deepEqual(requests,[]);
  results.externalRequests = requests;
  await writeFile('artifacts/browser-observations.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
} finally { await browser.close(); }
