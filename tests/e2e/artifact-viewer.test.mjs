import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { chromium } from 'playwright';

const port = 41821;
const baseUrl = `http://127.0.0.1:${port}`;

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(baseUrl)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Vite dev server did not start');
}

test('Markdown Mermaid renders, preserves fallback, and HTML artifact inspector works', async (t) => {
  const server = spawn('npm', ['run', 'dev', '--', '--port', String(port)], { stdio: 'ignore' });
  t.after(() => server.kill('SIGTERM'));
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${baseUrl}/project/artifacts-manager/artifact/with-artifact-skill-guide`, { waitUntil: 'networkidle' });
  await assert.doesNotReject(page.locator('pre.mermaid svg').waitFor({ timeout: 15_000 }));
  await assert.doesNotReject(page.getByText('Ordinary Markdown and non-Mermaid code fences remain ordinary content.').waitFor());

  await page.setViewportSize({ width: 375, height: 800 });
  assert.ok(await page.locator('pre.mermaid svg').count());

  await page.goto(`${baseUrl}/project/artifacts-manager/artifact/with-artifact-skill-guide?same-layout=1`, { waitUntil: 'networkidle' });
  await assert.doesNotReject(page.locator('pre.mermaid svg').waitFor({ timeout: 15_000 }));
  assert.equal(await page.locator('.mermaid-render-error').count(), 1, 'same-layout navigation leaves no stale Mermaid error markers');

  await page.route('**/mermaid@11.17.1/**', (route) => route.abort());
  await page.goto(`${baseUrl}/project/artifacts-manager/artifact/with-artifact-skill-guide?fallback=1`, { waitUntil: 'networkidle' });
  await assert.doesNotReject(page.getByText('Diagram unavailable. The Mermaid source is shown below.').first().waitFor({ timeout: 15_000 }));
  await assert.doesNotReject(page.getByText('flowchart LR').first().waitFor());
  await page.unrouteAll({ behavior: 'ignoreErrors' });

  await page.goto(`${baseUrl}/project/artifacts-manager/artifact/artifacts-manager-topology`, { waitUntil: 'networkidle' });
  const frame = page.frameLocator('iframe.artifact-iframe');
  await assert.doesNotReject(frame.locator('.mermaid svg').waitFor({ timeout: 15_000 }));
  await frame.locator('.mermaid svg g.node').first().click({ force: true });
  await assert.doesNotReject(frame.locator('#panel-title').waitFor());
});
