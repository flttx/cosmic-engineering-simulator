import { expect, test } from '@playwright/test';

test('殖民地内外观察、教学图层和工程切换保持独立', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?scene=C15');
  const main = page.locator('main');
  await expect(main).toHaveAttribute('data-scene', 'C15');
  await expect(page.getByLabel('工程', { exact: true })).toHaveValue('C15');
  await expect(main).toHaveAttribute('data-asset-status', 'ready', { timeout: 45000 });
  await expect(page.locator('.inspector')).not.toBeVisible();
  await page.getByRole('button', { name: '端盖入口', exact: false }).click();
  await expect(main).toHaveAttribute('data-focus', 'docking');
  await page.getByRole('button', { name: '内壁城市', exact: false }).click();
  await expect(main).toHaveAttribute('data-focus', 'city');
  await expect(main).toHaveAttribute('data-reference-frame', 'rotating');
  await page.getByRole('button', { name: '对象与讲解', exact: true }).click();
  await page.locator('.object-list').getByRole('button', { name: /生命保障/ }).click();
  await expect(main).toHaveAttribute('data-focus', 'life_support');
  await expect(main).toHaveAttribute('data-asset-status', 'ready', { timeout: 45000 });
  await expect(page.getByRole('button', { name: '爆炸视图', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '内壁城市', exact: false }).click();
  await page.getByRole('button', { name: '教学图层', exact: true }).click();
  await page.getByRole('button', { name: '剖面显示', exact: true }).click();
  await page.getByRole('button', { name: '重力方向', exact: true }).click();
  await page.getByLabel('旋转参考系', { exact: true }).selectOption('inertial');
  await expect(main).toHaveAttribute('data-reference-frame', 'inertial');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '教学图层', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '舱外全景', exact: false }).click();
  await expect(main).toHaveAttribute('data-focus', 'habitat');
  await page.getByLabel('工程', { exact: true }).selectOption('C01');
  await expect(main).toHaveAttribute('data-scene', 'C01');
  await expect(main).toHaveAttribute('data-focus', 'sun');
  await expect(page.getByRole('button', { name: '剖面显示', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '单体检查', exact: false }).click();
  await expect(main).toHaveAttribute('data-asset-status', 'ready', { timeout: 30000 });
  await page.getByLabel('工程', { exact: true }).selectOption('C15');
  await expect(main).toHaveAttribute('data-focus', 'habitat');
  await expect(page.locator('.inspector')).not.toBeVisible();
  await expect(main).toHaveAttribute('data-asset-status', 'ready', { timeout: 30000 });
  expect(errors).toEqual([]);
});

test('殖民地窄屏、刷新、自由观察和减弱动画可用', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?scene=C15');
  await page.getByRole('button', { name: '画质与显示设置', exact: true }).click();
  await page.getByLabel('减弱镜头与动画').check();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '内壁城市', exact: false }).click();
  await expect(page.locator('main')).toHaveAttribute('data-focus', 'city');
  await page.keyboard.press('Escape');
  await page.mouse.move(195, 400);
  await page.mouse.down();
  await page.mouse.move(260, 420, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('canvas')).toBeVisible();
  for (const width of [320, 390, 521]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const brand = await page.locator('.brand').boundingBox();
    const tools = await page.locator('.top-actions').boundingBox();
    expect(brand && tools && brand.x + brand.width <= tools.x).toBe(true);
  }
  await page.reload();
  await expect(page.locator('main')).toHaveAttribute('data-scene', 'C15');
  await expect(page.locator('main')).toHaveAttribute('data-focus', 'habitat');
});

test('殖民地资产失败显示可识别降级状态', async ({ page }) => {
  await page.route('**/assets/C15/*.glb', route => route.abort());
  await page.goto('/?scene=C15');
  await expect(page.locator('main')).toHaveAttribute('data-asset-status', 'fallback', { timeout: 30000 });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText(/正式资产加载失败/)).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});
