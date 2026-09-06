import { expect, test } from 'vitest';
import { MERMAID_INIT } from '../../src/lib/mermaid.ts';
import { MERMAID_RENDER_ERROR, renderMarkdown } from '../../src/lib/server/markdown.ts';

test('Mermaid init keeps intrinsic diagram size', () => {
  expect(MERMAID_INIT.flowchart.useMaxWidth).toBe(false);
  expect(MERMAID_INIT.flowchart.htmlLabels).toBe(false);
  expect(MERMAID_INIT.sequence.useMaxWidth).toBe(false);
});

test('Mermaid fences preserve escaped readable source', async () => {
  const html = await renderMarkdown('```mermaid\nflowchart LR\n  A[<unsafe>] --> B\n```');
  expect(html).toMatch(/<pre class="mermaid" data-mermaid-source="flowchart LR/);
  expect(html).toMatch(/tabindex="0"/);
  expect(html).toMatch(/A\[&lt;unsafe&gt;\]/);
  expect(html).toMatch(/--&gt; B/);
  expect(html).not.toMatch(/<unsafe>/);
});

test('sanitizer removes raw HTML, handlers, unsafe URLs, and SVG', async () => {
  const html = await renderMarkdown('<svg><circle></circle></svg><script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(2)">bad</a><img src=x onerror=alert(3)>');
  expect(html).not.toMatch(/svg|circle|script|alert\(|onclick|javascript:/i);
  expect(html).toMatch(/>bad<\/a>/);
  expect(html).toMatch(/<img src="x" \/>/);
});

test('ordinary Markdown and code remain ordinary content', async () => {
  const html = await renderMarkdown('# Heading\n\n```js\nconst value = "<tag>";\n```');
  expect(html).toMatch(/<h1>Heading<\/h1>/);
  expect(html).toMatch(/<pre><code class="language-js">const value = "&lt;tag&gt;";/);
  expect(html).not.toMatch(/class="mermaid"/);
});

test('malformed Mermaid retains source and a generic client error contract', async () => {
  const html = await renderMarkdown('```mermaid\nnot a valid diagram\n```');
  expect(html).toMatch(/not a valid diagram/);
  expect(MERMAID_RENDER_ERROR).toBe('Diagram unavailable. The Mermaid source is shown below.');
});
