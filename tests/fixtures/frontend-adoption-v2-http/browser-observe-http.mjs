// Supplementary HTTP derivative. Measurement code below is unchanged from the frozen file observer.
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

// Existing explicit runtime paths only; this module never installs a browser or packages.
export async function observe({ project, output, browserPath, puppeteerPath, reference = false, httpOrigin, proxyOrigin }) {
  const { default: puppeteer } = await import(pathToFileURL(resolve(puppeteerPath)).href);
  await mkdir(output, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', `--proxy-server=${proxyOrigin}`, `--proxy-bypass-list=<-loopback>;${new URL(httpOrigin).host}`, '--disable-background-networking', '--disable-quic', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp'] });
  const report = { browserVersion: await browser.version(), blockedRequests: [], views: {}, qualityJudgment: 'Not evaluated; independent review required.' };
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (new URL(request.url()).origin !== httpOrigin && !/^(?:data|blob):/i.test(request.url())) { report.blockedRequests.push(request.url()); void request.abort().catch(() => {}); }
      else void request.continue().catch(() => {});
    });
    const entry = new URL(reference ? '/reference.html' : '/index.html', httpOrigin).href;
    for (const [name, width, height] of [['wide', 1280, 900], ['narrow', 390, 844]]) {
      await page.setViewport({ width, height });
      await page.goto(entry, { waitUntil: 'load', timeout: 15000 });
      await page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
      report.views[name] = await page.evaluate(() => ({
        viewport: { width: innerWidth, height: innerHeight }, scrollWidth: document.documentElement.scrollWidth,
        text: document.body.innerText, links: [...document.querySelectorAll('a')].map(a => ({ text: a.textContent, href: a.getAttribute('href') })),
        ids: [...document.querySelectorAll('[id]')].map(e => e.id),
        landmarks: Object.fromEntries(['site-header', 'site-footer'].map(id => [id, document.getElementById(id)?.outerHTML ?? null])),
        typography: { bodyFont: getComputedStyle(document.body).fontFamily, headingFont: document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')).fontFamily : null },
        controls: [...document.querySelectorAll('input, button, [role=button]')].map(e => ({ tag: e.tagName, id: e.id, type: e.type, text: e.textContent, labels: [...(e.labels ?? [])].map(l => l.textContent), ariaLabel: e.getAttribute('aria-label') }))
      }));
    }
    await page.goto(entry, { waitUntil: 'load', timeout: 15000 });
    report.tabSequence = [];
    for (let n = 0; n < 14; n++) {
      await page.keyboard.press('Tab');
      report.tabSequence.push(await page.evaluate(() => {
        const e = document.activeElement, s = getComputedStyle(e);
        return { id: e.id, tag: e.tagName, text: e.textContent?.slice(0, 120), outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, boxShadow: s.boxShadow };
      }));
    }
    const email = await page.$('#member-email');
    if (email) {
      await email.focus(); await page.keyboard.type('bad-address');
      report.invalidEmail = await page.$eval('#member-email', e => ({ valid: e.checkValidity(), message: e.validationMessage }));
      await email.click({ clickCount: 3 }); await page.keyboard.type('trial@example.invalid');
      let reachedJoin = false;
      for (let n = 0; n < 14; n++) {
        await page.keyboard.press('Tab');
        if (await page.evaluate(() => document.activeElement.id === 'join-button')) { reachedJoin = true; break; }
      }
      if (reachedJoin) await page.keyboard.press('Enter');
      report.keyboardSubmission = { reachedJoin, ...(await page.evaluate(() => ({ events: window.__events ?? null, message: document.getElementById('form-message')?.textContent ?? null }))) };
    }
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(entry, { waitUntil: 'load', timeout: 15000 });
    report.reducedMotion = await page.evaluate(() => ({ matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      elements: [...document.querySelectorAll('body *')].filter(e => e.textContent?.trim()).map(e => {
        const s = getComputedStyle(e), r = e.getBoundingClientRect();
        return { id: e.id, tag: e.tagName, animationName: s.animationName, animationDuration: s.animationDuration, animationPlayState: s.animationPlayState, display: s.display, visibility: s.visibility, opacity: s.opacity, width: r.width, height: r.height };
      }) }));
  } finally { await browser.close(); }
  await writeFile(join(output, 'observations.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return report;
}
