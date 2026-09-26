const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const puppeteer = require('/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
(async () => {
 const root = path.resolve(__dirname, '..');
 const browser = await puppeteer.launch({executablePath:'/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const result = {screenshots:[],errors:[],externalRequests:[],checks:[]};
 try {
  const page = await browser.newPage();
  page.on('pageerror',e=>result.errors.push(e.message));
  await page.setRequestInterception(true);
  page.on('request',request=>{
    const url = new URL(request.url());
    if(url.origin !== 'http://northstar.test') { result.externalRequests.push(url.href); return request.abort(); }
    let file = path.join(root, decodeURIComponent(url.pathname));
    if (!path.extname(file)) file=path.join(file,'index.html');
    if(!fs.existsSync(file)) return request.respond({status:404,body:'Not found'});
    const ext=path.extname(file);
    request.respond({status:200,contentType:ext==='.css'?'text/css':ext==='.js'?'application/javascript':'text/html',body:fs.readFileSync(file)});
  });
  for(const [name,width,height] of [['wide',1280,900],['narrow',390,844]]) {
   await page.setViewport({width,height});
   await page.goto('http://northstar.test/');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:path.join(__dirname,`${name}.png`),fullPage:true});
   result.screenshots.push(`evidence/${name}.png`);
   result.checks.push(`${width}x${height}: no horizontal overflow`);
  }
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Skip to content');
  await page.focus('#join-button');
  await page.keyboard.press('Enter');
  assert.equal(await page.$eval('#member-email',el=>el.getAttribute('aria-invalid')),'true');
  assert.equal(await page.evaluate(()=>window.__events.length),0);
  await page.type('#member-email','invalid');
  await page.focus('#join-button');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>window.__events.length),0);
  await page.$eval('#member-email',el=>el.value='');
  await page.type('#member-email','family@example.com');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'join-button');
  await page.keyboard.press('Enter');
  assert.equal(await page.$eval('#form-message',el=>el.textContent),'Ready to continue with Family membership.');
  assert.deepEqual(await page.evaluate(()=>window.__events),[{name:'join_started',plan:'family'}]);
  assert.equal(page.url(),'http://northstar.test/');
  result.checks.push('Empty and invalid emails rejected without analytics','Keyboard submission confirms valid email and records exact local event','Valid submission stays on page');
  await page.click('#details-link');
  await page.waitForSelector('.document');
  assert.equal(await page.$eval('h1',el=>el.textContent),'Family membership details');
  for (const route of ['/privacy','/accessibility','/membership']) {
   const response=await page.goto('http://northstar.test'+route);
   assert.equal(response.status(),200);
  }
  result.checks.push('Membership, details, privacy and accessibility pages resolve');
  await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'},{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.setViewport({width:1280,height:900});
  await page.goto('http://northstar.test/');
  await page.screenshot({path:path.join(__dirname,'dark.png'),fullPage:true});
  result.screenshots.push('evidence/dark.png');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  result.checks.push('Dark appearance and reduced-motion render without overflow');
  assert.equal(result.errors.length,0);
  assert.equal(result.externalRequests.length,0);
  result.checks.push('No browser errors or external requests');
  fs.writeFileSync(path.join(__dirname,'observations.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
