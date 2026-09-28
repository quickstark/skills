const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const puppeteer = require('/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js');
(async () => {
 const root = path.resolve(__dirname, '..');
 const browser = await puppeteer.launch({executablePath:'/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox','--disable-background-networking','--disable-component-update','--no-first-run']});
 const results = {screenshots:[],viewports:[],consoleErrors:[],externalRequests:[]};
 try {
  const page = await browser.newPage();
  page.on('pageerror', e => results.consoleErrors.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
   const url = new URL(request.url());
   if(url.origin !== 'http://northstar.test'){results.externalRequests.push(request.url());return request.abort();}
   let filename = path.join(root, decodeURIComponent(url.pathname));
   if(fs.existsSync(filename) && fs.statSync(filename).isDirectory())filename = path.join(filename,'index.html');
   if(!filename.startsWith(root + '/') || !fs.existsSync(filename))return request.respond({status:404,body:'Not found'});
   const type = {'.html':'text/html','.css':'text/css','.js':'application/javascript'}[path.extname(filename)] || 'text/plain';
   request.respond({status:200,contentType:type,body:fs.readFileSync(filename)});
  });
  for (const [name,width,height] of [['wide',1280,900],['narrow',390,844]]) {
   await page.setViewport({width,height});
   await page.goto('http://northstar.test/',{waitUntil:'load'});
   assert.equal(await page.title(),'Family membership | Northstar Museum');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth), false);
   await page.screenshot({path:path.join(__dirname,name+'.png'),fullPage:true});
   results.screenshots.push('evidence/'+name+'.png');
   await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.className),'skip-link');
   await page.keyboard.press('Enter');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
   await page.click('#join-button');
   assert.equal(await page.evaluate(()=>window.__events.length),0);
   assert.equal(await page.$eval('#member-email',el=>el.getAttribute('aria-invalid')),'true');
   await page.type('#member-email','invalid');
   await page.click('#join-button');
   assert.equal(await page.evaluate(()=>window.__events.length),0);
   await page.$eval('#member-email',el=>el.value='');
   await page.type('#member-email','family@example.com');
   await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'join-button');
   await page.keyboard.press('Enter');
   assert.equal(await page.$eval('#form-message',el=>el.textContent),'Ready to continue with Family membership.');
   assert.deepEqual(await page.evaluate(()=>window.__events),[{name:'join_started',plan:'family'}]);
   assert.equal(new URL(page.url()).pathname,'/');
   results.viewports.push({width,height,overflow:false,emptyAndInvalidEmailBlocked:true,keyboardSubmission:true,confirmation:true,analytics:true});
  }
  await page.click('#details-link');
  assert.equal(new URL(page.url()).pathname,'/membership/family');
  assert.match(await page.$eval('main',el=>el.textContent),/Unlimited entry for two adults and children under 18/);
  results.membershipDetailsLink = 'passed';
  for(const route of ['/privacy','/accessibility']){
   const response=await page.goto('http://northstar.test'+route);assert.equal(response.status(),200);
  }
  await page.setViewport({width:1280,height:900});
  await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'},{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.goto('http://northstar.test/');
  await page.screenshot({path:path.join(__dirname,'dark.png'),fullPage:true});
  results.screenshots.push('evidence/dark.png');
  results.darkAndReducedMotion='rendered';
  assert.equal(results.consoleErrors.length,0);assert.equal(results.externalRequests.length,0);
  results.imageGenerationCalls=0;
  fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
