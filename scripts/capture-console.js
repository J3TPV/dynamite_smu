const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('[console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[pageerror]', err.message));
  page.on('requestfailed', req => console.log('[requestfailed]', req.url(), req.failure().errorText));
  page.on('response', res => {
    if (res.status() >= 400) console.log('[response]', res.status(), res.url());
  });
  console.log('Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('Captured page content length:', (await page.content()).length);
  await browser.close();
  console.log('Done.');
})().catch(e=>{console.error('Script error:', e); process.exit(1);});
