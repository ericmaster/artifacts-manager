import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { MERMAID_URL, TAILWIND_URL, formatResults, validateProject } from '../../src/lib/artifact-validator.mjs';

const roots = [];
const html = (extra = '') => `<script src="${TAILWIND_URL}"></script><pre class="mermaid" data-mermaid-source="flowchart LR">flowchart LR</pre><script type="module">import mermaid from '${MERMAID_URL}'</script>${extra}`;

async function fixture({ name = 'fixture', artifact = {}, files = { 'diagram.html': html() } } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'artman-validator-'));
  roots.push(root);
  const dir = path.join(root, '.artifacts-manager');
  await fs.mkdir(dir);
  await Promise.all(Object.entries(files).map(([file, content]) => fs.writeFile(path.join(dir, file), content)));
  await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify({ projectName: name, artifacts: [{ id: 'diagram', type: 'html', file: 'diagram.html', createdAt: '2026-01-01T00:00:00.000Z', tags: ['mermaid'], ...artifact }] }));
  return root;
}

afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });

test('validator fixture passes conforming artifact', async () => {
  const result = await validateProject(await fixture());
  expect(result.errors).toEqual([]);
});

test('validator fixture reports missing file', async () => {
  const root = await fixture({ files: {} });
  expect((await validateProject(root)).errors.map((error) => error.rule)).toContain('file-exists');
});

test('validator fixture reports path escape', async () => {
  const root = await fixture({ artifact: { file: '../escape.html' } });
  expect((await validateProject(root)).errors.map((error) => error.rule)).toContain('file-contained');
});

test('validator fixture reports missing Tailwind bootstrap', async () => {
  const root = await fixture({ files: { 'diagram.html': html().replace(TAILWIND_URL, 'https://cdn.tailwindcss.com') } });
  expect((await validateProject(root)).errors.map((error) => error.rule)).toContain('tailwind-url');
});

test('validator fixture reports missing Mermaid source', async () => {
  const root = await fixture({ files: { 'diagram.html': `<script src="${TAILWIND_URL}"></script><script type="module">import mermaid from '${MERMAID_URL}'</script>` } });
  expect((await validateProject(root)).errors.map((error) => error.rule)).toContain('mermaid-fallback');
});

test('validator fixture reports stale manifest entry', async () => {
  const root = await fixture({ files: { 'diagram.html': html(), 'stale.html': html() } });
  expect((await validateProject(root)).errors.map((error) => error.rule)).toContain('manifest-current');
});

test('validator fixture permits the KTH canvas chart allowlist', async () => {
  const root = await fixture({
    name: 'vespera',
    artifact: { id: 'kth-irl-self-evaluation', file: 'kth-irl-self-evaluation.html', tags: [], createdAt: '2026-08-20T16:00:16.921Z' },
    files: { 'kth-irl-self-evaluation.html': `<script src="${TAILWIND_URL}"></script><canvas id="radar"></canvas><svg aria-hidden="true" viewBox="0 0 24 24"></svg>` }
  });
  expect((await validateProject(root)).errors).toEqual([]);
});

test('failure output identifies project, file, rule, and line', () => {
  expect(formatResults([{ warnings: [], errors: [{ project: 'fixture', file: 'diagram.html', rule: 'rule', line: 7, message: 'bad' }] }])[0]).toBe('ERROR fixture:diagram.html:7 [rule] bad');
});
