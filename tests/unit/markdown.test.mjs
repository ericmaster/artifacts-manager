import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

async function loadMarkdownModule() {
  const source = await readFile(new URL('../../src/lib/server/markdown.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const markdownNamespace = await import('marked');
  const module = new vm.SourceTextModule(output, { identifier: 'markdown.ts' });
  await module.link(async (specifier) => {
    assert.equal(specifier, 'marked');
    return new vm.SyntheticModule(Object.keys(markdownNamespace), function () {
      for (const [name, value] of Object.entries(markdownNamespace)) this.setExport(name, value);
    });
  });
  await module.evaluate();
  return module.namespace;
}

test('Mermaid fences preserve escaped readable source', async () => {
  const { renderMarkdown } = await loadMarkdownModule();
  const html = await renderMarkdown('```mermaid\nflowchart LR\n  A[<unsafe>] --> B\n```');
  assert.match(html, /<pre class="mermaid" data-mermaid-source="flowchart LR/);
  assert.match(html, /A\[&lt;unsafe&gt;\]/);
  assert.match(html, /--&gt; B/);
  assert.doesNotMatch(html, /<unsafe>/);
});

test('sanitizer removes raw HTML, handlers, unsafe URLs, and SVG', async () => {
  const { renderMarkdown } = await loadMarkdownModule();
  const html = await renderMarkdown('<svg><circle></circle></svg><script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(2)">bad</a><img src=x onerror=alert(3)>');
  assert.doesNotMatch(html, /svg|circle|script|alert\(|onclick|javascript:|<img/i);
  assert.match(html, />bad<\/a>/);
});

test('ordinary Markdown and code remain ordinary content', async () => {
  const { renderMarkdown } = await loadMarkdownModule();
  const html = await renderMarkdown('# Heading\n\n```js\nconst value = "<tag>";\n```');
  assert.match(html, /<h1>Heading<\/h1>/);
  assert.match(html, /<pre><code class="language-js">const value = &quot;&lt;tag&gt;&quot;;/);
  assert.doesNotMatch(html, /class="mermaid"/);
});

test('malformed Mermaid retains source and a generic client error contract', async () => {
  const { renderMarkdown, MERMAID_RENDER_ERROR } = await loadMarkdownModule();
  const html = await renderMarkdown('```mermaid\nnot a valid diagram\n```');
  assert.match(html, /not a valid diagram/);
  assert.equal(MERMAID_RENDER_ERROR, 'Diagram unavailable. The Mermaid source is shown below.');
});
