import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const landingDir = path.resolve(__dirname, '../../landing');

test('Landing page interactive showcase renders all 3 demos with live Mermaid diagrams', async ({ browser }) => {
  // Built-in node http server for static files
  const server = http.createServer((req, res) => {
    let filePath = path.join(landingDir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(landingDir, 'index.html');
    }
    const ext = path.extname(filePath);
    const contentType = ext === '.html' ? 'text/html' : (ext === '.css' ? 'text/css' : (ext === '.js' ? 'application/javascript' : 'text/plain'));
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise((resolve) => server.listen(41829, '127.0.0.1', resolve));

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('http://127.0.0.1:41829', { waitUntil: 'networkidle' });
    expect(errors).toHaveLength(0);

    // 1. Verify Demo 1: Topology Explorer
    await expect(page.locator('#demo-topology')).toBeVisible();
    await expect(page.locator('#topology-mermaid svg')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#topo-inspect-title')).toContainText('API Gateway & Ingress');

    // Click Orchestrator node
    await page.click('.topo-node-card[data-node-id="orchestrator"]');
    await expect(page.locator('#topo-inspect-title')).toContainText('Task Orchestrator');

    // 2. Verify Demo 2: Grill Questionnaire
    await page.click('button[data-target="demo-questionnaire"]');
    await expect(page.locator('#demo-questionnaire')).toBeVisible();
    await expect(page.locator('#q1-mermaid svg')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#q2-mermaid svg')).toBeVisible({ timeout: 15_000 });

    // Verify 2 questions with free text exist
    await expect(page.locator('.grill-q-card')).toHaveCount(2);
    await expect(page.locator('#q1-free')).toBeVisible();
    await expect(page.locator('#q2-free')).toBeVisible();

    // Change choice in Q1 and verify live reactive update
    await page.click('input[name="q1-choice"][value="sqlite-daemon"]');
    await expect(page.locator('[data-choice="sqlite-daemon"]')).toHaveClass(/selected/);

    // 3. Verify Demo 3: Markdown Spec Viewer
    await page.click('button[data-target="demo-markdown"]');
    await expect(page.locator('#demo-markdown')).toBeVisible();
    await expect(page.locator('#markdown-spec-mermaid svg')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#md-rendered-view')).toBeVisible();

    // Toggle to Source view and back
    await page.click('button[data-md-view="source"]');
    await expect(page.locator('#md-source-view')).toBeVisible();
    await expect(page.locator('#md-rendered-view')).toBeHidden();

    await page.click('button[data-md-view="rendered"]');
    await expect(page.locator('#md-rendered-view')).toBeVisible();
    await expect(page.locator('#markdown-spec-mermaid svg')).toBeVisible();

    await page.close();
  } finally {
    server.close();
  }
});
