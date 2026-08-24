import { spawn } from 'node:child_process';
import { expect, test } from '@playwright/test';

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

test('Markdown Mermaid renders, preserves fallback, and HTML artifact inspector works', async ({ browser }) => {
  const server = spawn('npm', ['run', 'dev', '--', '--port', String(port)], { stdio: 'ignore' });
  try {
    await waitForServer();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      await page.goto(`${baseUrl}/project/artifacts-manager/artifact/with-artifact-skill-guide`, { waitUntil: 'networkidle' });
      await expect(page.locator('pre.mermaid svg')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Ordinary Markdown and non-Mermaid code fences remain ordinary content.')).toBeVisible();

      await page.setViewportSize({ width: 375, height: 800 });
      await expect(page.locator('pre.mermaid svg')).toHaveCount(1);

      await page.goto(`${baseUrl}/project/artifacts-manager/artifact/with-artifact-skill-guide?same-layout=1`, { waitUntil: 'networkidle' });
      await expect(page.locator('pre.mermaid svg')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('.mermaid-render-error')).toHaveCount(1);

      await page.route('**/mermaid@11.17.1/**', (route) => route.abort());
      await page.goto(`${baseUrl}/project/artifacts-manager/artifact/with-artifact-skill-guide?fallback=1`, { waitUntil: 'networkidle' });
      await expect(page.getByText('Diagram unavailable. The Mermaid source is shown below.').first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('flowchart LR').first()).toBeVisible();
      await page.unrouteAll({ behavior: 'ignoreErrors' });

      await page.goto(`${baseUrl}/project/artifacts-manager/artifact/artifacts-manager-topology`, { waitUntil: 'networkidle' });
      const frame = page.frameLocator('iframe.artifact-iframe');
      await expect(frame.locator('.mermaid svg')).toBeVisible({ timeout: 15_000 });
      await frame.locator('.mermaid svg g.node').first().click({ force: true });
      await expect(frame.locator('#panel-title')).toBeVisible();
    } finally {
      await page.close();
    }
  } finally {
    server.kill('SIGTERM');
  }
});
