// Spec: docs/specs/with-artifact-skill.md

import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const skill = readFileSync(new URL('../../skills/with-artifact/SKILL.md', import.meta.url), 'utf8');
const spec = readFileSync(new URL('../../docs/specs/with-artifact-skill.md', import.meta.url), 'utf8');

const CANONICAL = 'https://artifacts.nimblersoft.com/project/<projectSlug>/artifact/<artifactId>';
const SAMPLE_LINK = 'https://artifacts.nimblersoft.com/project/my-project/artifact/auth-request-path';

function fromHeading(markdown, heading) {
  const start = markdown.indexOf(heading);
  expect(start, heading).toBeGreaterThanOrEqual(0);
  return markdown.slice(start);
}

function fencedSample(markdown, label) {
  const marker = `### ${label}`;
  const start = markdown.indexOf(marker);
  expect(start, label).toBeGreaterThanOrEqual(0);
  const opener = '````markdown\n';
  const fence = markdown.indexOf(opener, start);
  expect(fence, `${label} fence`).toBeGreaterThan(start);
  const bodyStart = fence + opener.length;
  const bodyEnd = markdown.indexOf('\n````', bodyStart);
  expect(bodyEnd, `${label} close`).toBeGreaterThan(bodyStart);
  return markdown.slice(bodyStart, bodyEnd);
}

function between(text, startMarker, endMarker, from = 0) {
  const start = text.indexOf(startMarker, from);
  const end = text.indexOf(endMarker, start + startMarker.length);
  return text.slice(start + startMarker.length, end).trim();
}

test('chat delivery fences every diagram separately and defines fallbacks', () => {
  const delivery = fromHeading(skill, '## 5. Chat delivery');
  expect(delivery).toContain('title and a brief overview');
  expect(delivery).toContain('artifact reading order');
  expect(delivery).toContain('separate triple-backtick');
  expect(delivery).toContain('one or two sentences');
  expect(delivery).toContain('Exactly one canonical viewer link');
  expect(delivery).toContain(CANONICAL);
  expect(delivery).toContain('Do not invent a diagram.');
  expect(delivery).toContain('do not falsely claim rendered');
  expect(delivery).toContain('pinned Mermaid `11.17.1`');
  expect(delivery).toContain('artman validate` stay unchanged');
  expect(skill).toContain('[Chat delivery](#5-chat-delivery)');

  const reply = fencedSample(delivery, 'Two-diagram sample');
  const fences = [...reply.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((match) => match[1].trim());
  expect(fences).toEqual([
    'flowchart LR\n  client[Client] --> gateway[API Gateway]',
    'flowchart LR\n  gateway[API Gateway] --> orchestrator[Orchestrator]\n  orchestrator --> storage[D1]',
  ]);

  const edge = reply.indexOf('## Edge admission');
  const dispatch = reply.indexOf('## Dispatch and store');
  const firstFence = reply.indexOf('```mermaid');
  const secondFence = reply.indexOf('```mermaid', firstFence + 1);
  const linkAt = reply.indexOf(SAMPLE_LINK);
  expect(reply.startsWith('# Auth Request Path')).toBe(true);
  expect(edge).toBeGreaterThan(0);
  expect(edge).toBeLessThan(firstFence);
  expect(firstFence).toBeLessThan(dispatch);
  expect(dispatch).toBeLessThan(secondFence);
  expect(secondFence).toBeLessThan(linkAt);
  expect(between(reply, '## Edge admission', '```mermaid')).toMatch(/[.]$/);
  expect(between(reply, '## Dispatch and store', '```mermaid', dispatch)).toMatch(/[.]$/);
  expect(reply.match(/https:\/\/artifacts\.nimblersoft\.com\/project\/[a-z0-9-]+\/artifact\/[a-z0-9-]+/g)).toEqual([
    SAMPLE_LINK,
  ]);
  expect(reply).not.toMatch(/<iframe|<svg|```html/i);

  const noDiagram = fencedSample(delivery, 'No-diagram sample');
  expect(noDiagram).not.toMatch(/```mermaid/);
  expect(noDiagram).toMatch(/no diagram/i);
  expect(noDiagram).toContain('https://artifacts.nimblersoft.com/project/my-project/artifact/release-notes');
  expect(noDiagram.match(/https:\/\/artifacts\.nimblersoft\.com\/project\/[a-z0-9-]+\/artifact\/[a-z0-9-]+/g)).toHaveLength(1);

  const specDelivery = fromHeading(spec, '## 4. Chat delivery');
  expect(specDelivery).toContain('separate section');
  expect(specDelivery).toContain('artifact reading order');
  expect(specDelivery).toContain('one or two explanation sentences');
  expect(specDelivery).toContain('Exactly one canonical link');
  expect(specDelivery).toContain(CANONICAL);
  expect(specDelivery).toContain('Do not invent a diagram.');
  expect(specDelivery).toContain('do not falsely claim rendered');
  expect(specDelivery).toContain('https://cdn.jsdelivr.net/npm/mermaid@11.17.1/dist/mermaid.esm.min.mjs');
  expect(specDelivery).toContain('does not change artifact storage');
});
