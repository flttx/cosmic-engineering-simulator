import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const habitat = process.argv.includes('--scene=C15');
async function renderRevision() {
  const hash = createHash('sha256');
  const files = habitat ? ['src/scene/HabitatScene.tsx', 'src/scene/habitat.ts', 'src/App.tsx', 'src/state.ts', 'src/content.ts', 'src/types.ts', ...((await fs.readdir('public/assets/C15')).filter(file => file.endsWith('.glb')).sort().map(file => `public/assets/C15/${file}`))] : ['src/scene/CosmicScene.tsx', 'src/scene/StellarBody.tsx', 'src/scene/orbits.ts', 'src/state.ts', 'public/assets/C01/collector_lod0.glb', 'public/assets/C01/collector_lod1.glb', 'public/assets/solar/nasa_aia_171.jpg'];
  for (const file of files) hash.update(await fs.readFile(file));
  return hash.digest('hex');
}

const browser = await chromium.launch({ headless: true, channel: 'chromium' });
try {
  const revision = await renderRevision();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  const start = performance.now();
  await page.goto(`http://127.0.0.1:5174/${habitat ? '?scene=C15' : ''}`);
  if (habitat) await page.locator('main[data-asset-status="ready"]').waitFor({ timeout: 60000 });
  await page.locator('main[data-renderer]').waitFor();
  const firstMetricsMs = performance.now() - start;
  const results = [];
  for (const name of habitat ? ['舱外全景', '端盖入口', '内壁城市'] : ['恒星系全景', '巨构掠过', '单体检查']) {
    await page.getByRole('button', { name, exact: false }).click();
    if (habitat) await page.locator('main[data-asset-status="ready"]').waitFor({ timeout: 60000 });
    await page.waitForTimeout(5000);
    process.stdout.write(`Sampling ${name}: 60 seconds\n`);
    const measured = await page.evaluate(() => new Promise(resolve => {
      const samples = [];
      let previous = performance.now();
      const started = previous;
      function frame(now) {
        samples.push(now - previous);
        previous = now;
        if (now - started < 60000) requestAnimationFrame(frame);
        else {
          samples.sort((a, b) => a - b);
          const main = document.querySelector('main');
          resolve({ durationMs: now - started, frames: samples.length, averageFps: samples.length / ((now - started) / 1000), medianFps: 1000 / samples[Math.floor(samples.length / 2)], frameP95: samples[Math.floor(samples.length * 0.95)], renderer: main?.dataset.renderer, calls: Number(main?.dataset.calls), triangles: Number(main?.dataset.triangles), textures: Number(main?.dataset.textures) });
        }
      }
      requestAnimationFrame(frame);
    }));
    results.push({ view: name, ...measured });
    process.stdout.write(JSON.stringify(results.at(-1)) + '\n');
  }
  await fs.mkdir('artifacts/performance', { recursive: true });
  const versionStable = revision === await renderRevision();
  await fs.writeFile(`artifacts/performance/${habitat ? 'C15-benchmark' : 'benchmark'}.json`, JSON.stringify({ scene: habitat ? 'C15' : 'C01', viewport: '1920x1080', deviceScaleFactor: 1, quality: 'standard', browser: await browser.version(), renderRevision: revision, versionStable, firstMetricsMs, results, failures, capturedAt: new Date().toISOString() }, null, 2));
  if (!versionStable) throw new Error('Rendering revision changed during sampling; repeat against a stable version.');
} finally { await browser.close(); }
