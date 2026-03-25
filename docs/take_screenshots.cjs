const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, 'screenshots');
const LICENSE_KEY = 'eyJlbWFpbCI6Im1hdHRoaWFzQGRlcnJlZ25lci5kZSIsImV4cCI6MjA4OTcxNjg5OCwiZmVhdHVyZXMiOlsidW5saW1pdGVkX2RldmljZXMiLCJtdWx0aWxpbmd1YWwiLCJleGNlbCIsImhhX3N5bmMiLCJjYW1lcmEiLCJiYXJjb2RlIl0sInRpZXIiOiJwcm8ifQ.MDQwYzdmMTZiODQ3YzA2ZTQxNzU5YmRlOGU2YWZiN2NjMWUxMWIyNjYzNmRjMmIzNGJiMDU3YmFkZDI5MjA3Mw';

async function injectLicense(page) {
  await page.evaluate((key) => {
    localStorage.setItem('gv_license_key', key);
    localStorage.setItem('gv_language', 'de');
  }, LICENSE_KEY);
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });

  // Inject license before first load
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await injectLicense(page);
  // Reload so app picks up the license and language
  await page.reload({ waitUntil: 'networkidle0', timeout: 15000 });
  await page.waitForSelector('nav', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 500));

  // 1. Dashboard
  console.log('1/6 Dashboard...');
  await page.screenshot({ path: path.join(OUT_DIR, 'de_dashboard.png'), fullPage: false });

  // 2. Geräteliste
  console.log('2/6 Geräteliste...');
  const nav1 = await page.$$('nav button');
  await nav1[1].click();
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, 'de_geraete.png'), fullPage: false });

  // 3. Formular leer
  console.log('3/6 Formular...');
  const nav2 = await page.$$('nav button');
  await nav2[2].click();
  await new Promise(r => setTimeout(r, 1000));
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
  await page.screenshot({ path: path.join(OUT_DIR, 'de_formular_ausgefuellt.png'), fullPage: false });

  // 5. Kamera-Dialog
  console.log('5/6 Kamera-Dialog...');
  const cameraBtn = await page.$('button[title*="Foto"], button[title*="foto"], button[title*="Kamera"]');
  if (cameraBtn) {
    await cameraBtn.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(OUT_DIR, 'de_kamera.png'), fullPage: false });
    // Close overlay
    const allBtns = await page.$$('button');
    for (const btn of allBtns) {
      const svg = await btn.$('svg');
      const parent = await btn.evaluate(el => el.closest('.absolute') ? true : false);
      if (svg && parent) { await btn.click(); break; }
    }
    await new Promise(r => setTimeout(r, 300));
  } else {
    console.log('  Kamera-Button nicht gefunden, überspringe');
  }

  // 6. Einstellungen
  console.log('6/6 Einstellungen...');
  const nav3 = await page.$$('nav button');
  await nav3[3].click();
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, 'de_einstellungen.png'), fullPage: false });

  await browser.close();

  const fs = require('fs');
  const files = fs.readdirSync(OUT_DIR).filter(f => f.startsWith('de_'));
  console.log(`\n${files.length} Screenshots gespeichert:`);
  files.forEach(f => {
    const size = fs.statSync(path.join(OUT_DIR, f)).size;
    console.log(`  ${f} (${Math.round(size/1024)} KB)`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
