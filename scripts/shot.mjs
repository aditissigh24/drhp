import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
const base = `${process.env.HOME}/Library/Caches/ms-playwright`;
const dir = readdirSync(base).filter(d => d.startsWith('chromium-')).sort().pop();
const browser = await chromium.launch({ executablePath: `${base}/${dir}/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing` });
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 }, deviceScaleFactor: 2 });
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);
await page.fill('.pagebox input', process.argv[3] || '228');
await page.waitForTimeout(4500);
// select a card so the selected-state styling is visible
await page.evaluate(() => document.querySelectorAll('.card')[2]?.dispatchEvent(new MouseEvent('click',{bubbles:true})));
await page.waitForTimeout(1200);
await page.screenshot({ path: process.argv[2] });
console.log(await page.evaluate(() => {
  const c = document.querySelector('.card.selected');
  const cs = getComputedStyle(c);
  return {
    panelWidth: getComputedStyle(document.querySelector('.panel')).width,
    selectedCardBg: cs.backgroundColor, selectedCardBorder: cs.borderColor,
    chipFont: getComputedStyle(document.querySelector('.checkchip')).fontSize,
    legendBg: getComputedStyle(document.querySelector('.legend-item')).backgroundColor,
    rings: document.querySelectorAll('.mark .ring').length,
  };
}), 'errors:', errs);
await browser.close();
