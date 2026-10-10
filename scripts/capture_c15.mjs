import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const directory = '.impeccable/review';
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chromium' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5174/?scene=C15');
  await page.locator('main[data-asset-status="ready"]').waitFor({ timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  for (const [view, file] of [['舱外全景', 'exterior'], ['端盖入口', 'entrance'], ['内壁城市', 'interior']]) {
    await page.getByRole('button', { name: view, exact: false }).click();
    await page.locator('main[data-asset-status="ready"]').waitFor({ timeout: 60000 });
    await page.waitForTimeout(4500);
    if (await page.locator('.inspector').isVisible()) await page.keyboard.press('Escape');
    await page.screenshot({ path: `${directory}/C15-${file}.png` });
  }
  await page.getByRole('button', { name: '教学图层', exact: true }).click();
  await page.getByRole('button', { name: '重力方向', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${directory}/C15-gravity.png` });
  await page.getByRole('button', { name: '舱外全景', exact: false }).click();
  await page.getByRole('button', { name: '教学图层', exact: true }).click();
  await page.getByRole('button', { name: '重力方向', exact: true }).click();
  await page.getByRole('button', { name: '剖面显示', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${directory}/C15-cutaway.png` });
  await page.getByRole('button', { name: '教学图层', exact: true }).click();
  for (const name of ['剖面显示', '重力方向']) {
    const layer = page.getByRole('button', { name, exact: true });
    if (await layer.getAttribute('aria-pressed') === 'true') await layer.click();
  }
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole('button', { name: '内壁城市', exact: false }).click();
  await page.locator('main[data-asset-status="ready"]').waitFor({ timeout: 60000 });
  await page.waitForTimeout(4500);
  if (await page.locator('.inspector').isVisible()) await page.keyboard.press('Escape');
  await page.screenshot({ path: `${directory}/C15-interior-pc.png` });
  await page.getByRole('button', { name: '对象与讲解', exact: true }).click();
  await page.locator('.object-list').getByRole('button', { name: /生命保障/ }).click();
  await page.waitForTimeout(4500);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: `${directory}/C15-life-support.png` });
  for (const width of process.argv.includes('--mobile') ? [390, 320, 521] : []) {
    await page.setViewportSize({ width, height: 844 });
    await page.reload();
    await page.locator('main[data-asset-status="ready"]').waitFor({ timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${directory}/C15-mobile-${width}.png` });
    await page.getByRole('button', { name: '内壁城市', exact: false }).click();
    await page.waitForTimeout(4500);
    if (await page.locator('.inspector').isVisible()) await page.keyboard.press('Escape');
    await page.screenshot({ path: `${directory}/C15-interior-${width}.png` });
  }
  await fs.writeFile(`${directory}/C15-capture.json`, JSON.stringify({ errors, pcViewports: ['1440x900', '1920x1080'], defaultOverlaysOff: true, capturedAt: new Date().toISOString() }, null, 2));
  process.stdout.write(JSON.stringify({ directory, errors }) + '\n');
} finally { await browser.close(); }
