import puppeteer from '/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { writeFile } from 'node:fs/promises';
const browser = await puppeteer.launch({ executablePath: '/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--no-sandbox', '--disable-background-networking'] });
const results = [];
try {
  const page = await browser.newPage();
  const errors = [];
  const externalRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().startsWith('file:')) request.continue();
    else { externalRequests.push(request.url()); request.abort(); }
  });
  for (const [name, width, height, scheme] of [['wide',1280,900,'light'], ['narrow',390,844,'light'], ['wide-dark',1280,900,'dark'], ['narrow-dark',390,844,'dark']]) {
    await page.setViewport({width,height});
    await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme},{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.goto('file:///tmp/qs-frontend-trial-pYGyh5/index.html');
    await page.screenshot({path:`evidence/${name}.png`,fullPage:true});
    const layout = await page.evaluate(() => {
      const button = document.querySelector('button');
      const header = document.querySelector('header');
      return { overflow: document.documentElement.scrollWidth > innerWidth, headerHeight: header.getBoundingClientRect().height, buttonBottom:button.getBoundingClientRect().bottom, detailsHref:document.querySelector('#details-link').getAttribute('href'), title:document.querySelector('h1').innerText, buttonColor:getComputedStyle(button).color, buttonBackground:getComputedStyle(button).backgroundColor };
    });
    if (layout.overflow) throw new Error(`${name}: horizontal overflow`);
    results.push({name,...layout});
  }
  await page.keyboard.press('Tab');
  const firstFocus = await page.evaluate(() => document.activeElement.textContent);
  if(firstFocus !== 'Skip to content') throw new Error('Missing first keyboard skip link');
  await page.focus('#join-button');
  await page.keyboard.press('Enter');
  const empty = await page.evaluate(() => ({error:document.querySelector('#email-error').textContent,focus:document.activeElement.id,events:window.__events.length}));
  if (empty.events !== 0 || empty.focus !== 'member-email' || !empty.error) throw new Error('Empty form validation failed');
  await page.type('#member-email','invalid');
  await page.keyboard.press('Enter');
  const invalid = await page.evaluate(() => ({error:document.querySelector('#email-error').textContent,events:window.__events.length}));
  if (invalid.events !== 0 || !invalid.error) throw new Error('Invalid email validation failed');
  await page.$eval('#member-email', element => {element.value='';});
  await page.type('#member-email','family@example.com');
  await page.keyboard.press('Enter');
  const valid = await page.evaluate(() => ({message:document.querySelector('#form-message').textContent,events:window.__events,focus:document.activeElement.id}));
  if(valid.message !== 'Ready to continue with Family membership.' || JSON.stringify(valid.events) !== JSON.stringify([{name:'join_started',plan:'family'}])) throw new Error('Valid form behavior failed');
  await page.screenshot({path:'evidence/narrow-confirmation.png',fullPage:true});
  const evidence = { layouts:results, keyboard:{firstFocus,empty,invalid,valid}, errors, externalRequests, imageCalls:0 };
  await writeFile('evidence/browser-observations.json',JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence,null,2));
  if(errors.length || externalRequests.length) throw new Error('Unexpected errors or external requests');
} finally { await browser.close(); }
