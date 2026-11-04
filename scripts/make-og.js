// Renders scripts/og-card.html into public/og.png (1200 x 630), the image shown when the site is shared.
// Run: node scripts/make-og.js
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto('file://' + path.join(root, 'scripts', 'og-card.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(root, 'public', 'og.png') });
  await browser.close();
  console.log('built public/og.png');
})();
