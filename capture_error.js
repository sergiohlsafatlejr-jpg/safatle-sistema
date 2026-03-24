import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE UNCAUGHT EXCEPTION:', error.message);
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' }).catch(e => console.error(e));
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
