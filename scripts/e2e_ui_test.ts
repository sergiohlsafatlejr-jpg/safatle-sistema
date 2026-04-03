import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  console.log("Starting Puppeteer E2E test...");
  const browser = await puppeteer.launch({
    headless: true, // Use headless to not block
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    console.log("Navigating to http://localhost:3000/integracao ...");
    await page.goto('http://localhost:3000/integracao', { waitUntil: 'networkidle0' });
    
    // Take a screenshot of the integration page
    await page.screenshot({ path: 'C:\\Users\\sergi\\.gemini\\antigravity\\brain\\6b9cbeac-f374-4401-87be-73c427a0ae00\\integracao_screen_test.png' });
    console.log("Integration screen screenshot saved.");

    console.log("Navigating to http://localhost:3000/buscador ...");
    await page.goto('http://localhost:3000/buscador', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'C:\\Users\\sergi\\.gemini\\antigravity\\brain\\6b9cbeac-f374-4401-87be-73c427a0ae00\\buscador_screen_test.png' });

    // Try a search on Buscador Global (Type something into the first input)
    console.log("Testing Global Search...");
    // Just looking for an input of type text or search
    const searchInput = await page.$('input[placeholder*="nome"], input[type="text"], input[type="search"]');
    if (searchInput) {
        await searchInput.type('Silva');
        // Look for search button
        const searchBtn = await page.$('button[type="submit"]');
        if (searchBtn) {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {}),
                searchBtn.click(),
                new Promise(r => setTimeout(r, 2000))
            ]);
        }
        await page.screenshot({ path: 'C:\\Users\\sergi\\.gemini\\antigravity\\brain\\6b9cbeac-f374-4401-87be-73c427a0ae00\\buscador_results_test.png' });
        console.log("Search results screenshot saved.");
    }

    console.log("Navigating to http://localhost:3000/conciliacao ...");
    await page.goto('http://localhost:3000/conciliacao', { waitUntil: 'networkidle0' });
    
    // Click some tabs in conciliation if they exist
    const tabs = await page.$$('[role="tab"]');
    for (let i = 0; i < tabs.length; i++) {
        await tabs[i].click();
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: `C:\\Users\\sergi\\.gemini\\antigravity\\brain\\6b9cbeac-f374-4401-87be-73c427a0ae00\\conciliacao_tab_${i}_test.png` });
    }
    console.log("Conciliation tabs screenshot saved.");

    console.log("All E2E checks completed without crashing!");

  } catch (err) {
    console.error("E2E Test Failed:", err);
  } finally {
    await browser.close();
  }
}

run();
