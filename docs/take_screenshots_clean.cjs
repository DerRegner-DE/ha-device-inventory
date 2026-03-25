const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, 'screenshots');
const LICENSE_KEY = 'eyJlbWFpbCI6Im1hdHRoaWFzQGRlcnJlZ25lci5kZSIsImV4cCI6MjA4OTcxNjg5OCwiZmVhdHVyZXMiOlsidW5saW1pdGVkX2RldmljZXMiLCJtdWx0aWxpbmd1YWwiLCJleGNlbCIsImhhX3N5bmMiLCJjYW1lcmEiLCJiYXJjb2RlIl0sInRpZXIiOiJwcm8ifQ.MDQwYzdmMTZiODQ3YzA2ZTQxNzU5YmRlOGU2YWZiN2NjMWUxMWIyNjYzNmRjMmIzNGJiMDU3YmFkZDI5MjA3Mw';

async function injectLicense(page) {
  await page.evaluate((key) => {
    localStorage.setItem('gv_license_key', key);
    localStorage.setItem('gv_language', 'de');
  }, LICENSE_KEY);
}

// Replace text in DOM for clean screenshots
async function cleanPrivateData(page) {
  await page.evaluate(() => {
    // Walk all text nodes and replace private data
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      // Email
      node.textContent = node.textContent.replace(/matthias@derregner\.de/g, 'nutzer@example.com');
      // License key (long base64 string)
      if (node.textContent.length > 80 && node.textContent.includes('eyJ')) {
        node.textContent = 'PRO-XXXXX-XXXXX-XXXXX-XXXXX';
      }
      // Valid until date
      node.textContent = node.textContent.replace(/Gültig bis \d+\.\d+\.\d+/g, 'Gültig bis 01.01.2027');
      // Version numbers
      node.textContent = node.textContent.replace(/1\.3\.8/g, '1.0');
      node.textContent = node.textContent.replace(/1\/50/g, '3/50');
    }
    // Also clean input values
    document.querySelectorAll('input').forEach(input => {
      if (input.value && input.value.includes('eyJ')) {
        input.value = 'PRO-XXXXX-XXXXX-XXXXX-XXXXX';
      }
    });
  });
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });

  // Inject license
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await injectLicense(page);
  await page.reload({ waitUntil: 'networkidle0', timeout: 15000 });
  await page.waitForSelector('nav', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 500));

  // 1. Dashboard
  console.log('1/6 Dashboard...');
  await cleanPrivateData(page);
  await page.screenshot({ path: path.join(OUT_DIR, 'de_dashboard.png'), fullPage: false });

  // 2. Geräteliste
  console.log('2/6 Geräteliste...');
  const nav1 = await page.$$('nav button');
  await nav1[1].click();
  await new Promise(r => setTimeout(r, 1000));
  await cleanPrivateData(page);
  await page.screenshot({ path: path.join(OUT_DIR, 'de_geraete.png'), fullPage: false });

  // 3. Formular leer
  console.log('3/6 Formular...');
  const nav2 = await page.$$('nav button');
  await nav2[2].click();
  await new Promise(r => setTimeout(r, 1000));
  await cleanPrivateData(page);
  await page.screenshot({ path: path.join(OUT_DIR, 'de_formular.png'), fullPage: false });

  // 4. Formular ausgefüllt
  console.log('4/6 Formular ausgefüllt...');
  await page.select('select', 'router');
  await new Promise(r => setTimeout(r, 300));
  const inputs = await page.$$('input[type="text"]');
  for (const input of inputs) {
    const ph = await input.evaluate(el => el.placeholder);
    if (ph && ph.includes('FritzBox')) {
      await input.click({ clickCount: 3 });
      await input.type('FritzBox 6660 Cable');
    } else if (ph && ph.includes('6660')) {
      await input.click({ clickCount: 3 });
      await input.type('6660 Cable');
    } else if (ph && ph.includes('AVM')) {
      await input.click({ clickCount: 3 });
      await input.type('AVM');
    }
  }
  await cleanPrivateData(page);
  await page.screenshot({ path: path.join(OUT_DIR, 'de_formular_ausgefuellt.png'), fullPage: false });

  // 5. Kamera-Dialog
  console.log('5/6 Kamera-Dialog...');
  const cameraBtn = await page.$('button[title*="Foto"], button[title*="foto"], button[title*="Kamera"]');
  if (cameraBtn) {
    await cameraBtn.click();
    await new Promise(r => setTimeout(r, 800));
    await cleanPrivateData(page);
    await page.screenshot({ path: path.join(OUT_DIR, 'de_kamera.png'), fullPage: false });
    // Close overlay
    const allBtns = await page.$$('button');
    for (const btn of allBtns) {
      const hasClose = await btn.evaluate(el => el.closest('[style*="z-index: 9999"]') && el.querySelector('svg') ? true : false);
      if (hasClose) { await btn.click(); break; }
    }
    await new Promise(r => setTimeout(r, 300));
  } else {
    console.log('  Kamera-Button nicht gefunden');
  }

  // 6. Einstellungen (with cleaned private data)
  console.log('6/6 Einstellungen...');
  const nav3 = await page.$$('nav button');
  await nav3[3].click();
  await new Promise(r => setTimeout(r, 1000));
  await cleanPrivateData(page);
  await page.screenshot({ path: path.join(OUT_DIR, 'de_einstellungen.png'), fullPage: false });

  await browser.close();

  const files = fs.readdirSync(OUT_DIR).filter(f => f.startsWith('de_'));
  console.log(`\n${files.length} Screenshots gespeichert:`);
  files.forEach(f => {
    const size = fs.statSync(path.join(OUT_DIR, f)).size;
    console.log(`  ${f} (${Math.round(size/1024)} KB)`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
