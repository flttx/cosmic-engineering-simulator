import { expect, test } from '@playwright/test';

test('精简首屏、互斥工具面板和键盘关闭可用', async ({ page }) => {
  await page.setViewportSize({ width: 521, height: 694 });
  await page.goto('/');
  await expect(page.locator('.inspector')).not.toBeVisible();
  await expect(page.getByRole('button', { name: '能量采集', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '单步动画', exact: true })).toHaveCount(0);
  const layers = page.getByRole('button', { name: '教学图层', exact: true });
  await layers.click();
  await page.getByRole('button', { name: '能量采集', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(layers).toBeFocused();
  await expect(layers).toHaveAttribute('aria-expanded', 'false');
  await layers.click();
  await expect(page.getByRole('button', { name: '能量采集', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '收起教学图层', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(layers).toBeFocused();
  await expect(layers).toHaveAttribute('aria-expanded', 'false');
  await layers.click();
  await page.getByRole('button', { name: '对象与讲解', exact: true }).click();
  await expect(page.locator('.inspector')).toBeVisible();
  await expect(page.locator('#layers-panel')).toHaveCount(0);
  await page.getByRole('button', { name: '画质与显示设置', exact: true }).click();
  await expect(page.locator('.inspector')).not.toBeVisible();
  await expect(page.getByRole('button', { name: '单步动画', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  for (const width of [320, 390, 521]) {
    await page.setViewportSize({ width, height: 694 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const brand = await page.locator('.brand').boundingBox();
    const tools = await page.locator('.top-actions').boundingBox();
    expect(brand && tools && brand.x + brand.width <= tools.x).toBe(true);
  }
});

test('正式模型、部件拆解、返回及独立图层组成完整观察路径', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /戴森群/ })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: '暂停动画', exact: true }).click();
  await page.getByRole('button', { name: '单体检查', exact: false }).click();
  await expect(page.locator('main')).toHaveAttribute('data-focus', 'collector_hero');
  await expect(page.locator('main')).toHaveAttribute('data-asset-status', 'ready', { timeout: 30000 });
  for (const name of ['采能面', '承力桁架', '散热器', '姿态模块']) {
    await page.locator('.object-list').getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.breadcrumbs')).toContainText(name);
    await page.getByRole('button', { name: '隔离', exact: true }).click();
    await expect(page.getByRole('button', { name: '隔离', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: '爆炸视图', exact: true }).click();
    await page.getByRole('button', { name: '上一层', exact: true }).click();
    await expect(page.locator('main')).toHaveAttribute('data-focus', 'collector_hero');
  }
  await page.getByRole('button', { name: '上一层', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-focus', 'orbit_family_mid');
  await page.getByRole('button', { name: '上一层', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-focus', 'sun');
  await page.getByRole('button', { name: '教学图层', exact: true }).click();
  const energy = page.getByRole('button', { name: '能量采集', exact: true });
  const heat = page.getByRole('button', { name: '废热排散', exact: true });
  await energy.click();
  await expect(energy).toHaveAttribute('aria-pressed', 'true');
  await expect(heat).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: '画质与显示设置', exact: true }).click();
  await page.getByRole('button', { name: '单步动画', exact: true }).click();
  await expect(page.getByRole('button', { name: '继续动画', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '教学图层', exact: true }).click();
  await page.getByRole('button', { name: '对象标注', exact: true }).click();
  await page.getByRole('button', { name: '隐藏界面', exact: true }).click();
  await expect(page.getByRole('button', { name: '显示界面', exact: true })).toBeVisible();
  await expect(page.locator('.scene-label')).toHaveCount(0);
  await page.getByRole('button', { name: '显示界面', exact: true }).click();
  await expect(page.getByRole('button', { name: '对象标注', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('教学步骤、减弱动画、窗口变化及键盘操作可用', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '画质与显示设置', exact: true }).click();
  await page.getByLabel('减弱镜头与动画').check();
  await page.getByRole('button', { name: '画质与显示设置', exact: true }).click();
  await page.getByRole('button', { name: '对象与讲解', exact: true }).click();
  await page.getByRole('button', { name: '原理讲解', exact: true }).click();
  await page.locator('.topic-list button').nth(1).click();
  await expect(page.locator('main')).toHaveAttribute('data-focus', 'collector_hero');
  await page.keyboard.press('Escape');
  await expect(page.locator('.inspector')).not.toBeVisible();
  await expect(page.getByRole('button', { name: '对象与讲解', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('main')).toHaveAttribute('data-focus', 'orbit_family_mid');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.reload();
  await expect(page.locator('main')).toHaveAttribute('data-focus', 'sun');
  await page.getByRole('button', { name: '隐藏界面', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '显示界面', exact: true })).toBeVisible();
});

test('GLB 加载失败保留场景并提供准确降级提示', async ({ page }) => {
  await page.route('**/assets/C01/*.glb', route => route.abort('failed'));
  await page.goto('/');
  await page.getByRole('button', { name: '单体检查', exact: false }).click();
  await expect(page.locator('main')).toHaveAttribute('data-asset-status', 'fallback', { timeout: 30000 });
  await expect(page.getByText('暂用结构示意 · 正式资产加载失败')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: '全景', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-focus', 'sun');
});

test('真实模型拾取、拖动接管和跨距离观察保持对象身份', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '暂停动画', exact: true }).click();
  await page.getByRole('button', { name: '画质与显示设置', exact: true }).click();
  await page.getByLabel('减弱镜头与动画').check();
  await page.getByRole('button', { name: '画质与显示设置', exact: true }).click();
  await page.getByRole('button', { name: '单体检查', exact: false }).click();
  await expect(page.locator('main')).toHaveAttribute('data-asset-status', 'ready', { timeout: 30000 });
  await page.locator('canvas').click({ position: { x: 740, y: 490 } });
  await expect(page.locator('main')).toHaveAttribute('data-selection', /^(collector_surface|support_truss|radiator|attitude_module)$/);
  const selected = await page.locator('main').getAttribute('data-selection');
  await page.mouse.move(740, 490);
  await page.mouse.down();
  await page.mouse.move(850, 510, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('main')).toHaveAttribute('data-selection', selected ?? '');
  await page.mouse.wheel(0, 8000);
  await expect(page.locator('main')).toHaveAttribute('data-selection', selected ?? '');
  await page.getByRole('button', { name: '全景', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-selection', '');
});

test('手机触控可切换构图并恢复界面', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5174');
    await page.getByRole('button', { name: '单体检查', exact: false }).tap();
    await expect(page.locator('main')).toHaveAttribute('data-focus', 'collector_hero');
    await expect(page.locator('main')).toHaveAttribute('data-asset-status', 'ready', { timeout: 30000 });
    await page.getByRole('button', { name: '隐藏界面', exact: true }).tap();
    await page.touchscreen.tap(205, 420);
    await expect(page.getByRole('button', { name: '显示界面', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '显示界面', exact: true }).tap();
    await page.getByRole('button', { name: '全景', exact: true }).tap();
    await expect(page.locator('main')).toHaveAttribute('data-focus', 'sun');
  } finally { await context.close(); }
});

test('仅保留日冕观测与用户截图尺寸的近观可用', async ({ page }) => {
  await page.setViewportSize({ width: 497, height: 639 });
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-solar-view', 'euv');
  await expect(page.locator('main')).toHaveAttribute('data-solar-status', 'ready');
  await expect(page.locator('.scale-notice')).toContainText('伪彩');
  await expect(page.locator('#solar-view')).toHaveCount(0);
  await expect(page.getByText(/光球.*灰度/)).toHaveCount(0);
  await expect(page.locator('.scale-notice')).toContainText('171 Å 伪彩');
  await page.mouse.move(245, 350);
  for (let index = 0; index < 18; index++) await page.mouse.wheel(0, -400);
  await expect(page.getByRole('button', { name: '恒星系全景', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('main')).toHaveAttribute('data-solar-status', 'ready');
});

test('外围卫星说明与画质切换保持对象配置', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '对象与讲解', exact: true }).click();
  await page.locator('.object-list').getByRole('button', { name: '北倾轨道族', exact: true }).click();
  await page.locator('.object-list').getByRole('button', { name: /北倾采能卫星/ }).click();
  await expect(page.locator('.role')).toContainText('量产采能卫星');
  await expect(page.locator('.explanation')).toContainText('远景简化模型');
  await expect(page.locator('.explanation')).toContainText('双翼标准配置');
  const id = await page.locator('main').getAttribute('data-selection');
  await page.getByRole('button', { name: '画质与显示设置', exact: true }).click();
  await page.getByLabel('画质', { exact: true }).selectOption('low');
  await expect(page.locator('main')).toHaveAttribute('data-selection', id ?? '');
  await expect(page.locator('.role')).toContainText('双翼标准配置');
});

test('太阳影像加载失败保持场景并准确报告', async ({ page }) => {
  await page.route('**/assets/solar/*.jpg', route => route.abort('failed'));
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-solar-status', 'fallback');
  await expect(page.getByText('观测影像未载入 · 显示简化表面')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});
