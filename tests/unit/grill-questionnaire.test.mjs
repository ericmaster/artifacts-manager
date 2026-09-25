// Spec: docs/specs/with-artifact-skill.md

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const template = readFileSync(
  new URL('../../skills/with-artifact/assets/grill-questionnaire.html', import.meta.url),
  'utf8'
);
const skill = readFileSync(
  new URL('../../skills/with-artifact/SKILL.md', import.meta.url),
  'utf8'
);

describe('grill questionnaire custom answers', () => {
  it('requires Other on every question and exports free text as its answer', () => {
    expect(skill).toContain('Every question');
    expect(skill).toContain('`Other`');
    expect(skill).toContain('authoritative answer');
    expect(template).toContain('value="other"');
    expect([...template.matchAll(/<label class="choice-option[^\"]*" data-choice-id="([^"]+)"/g)].map((match) => match[1]).at(-1)).toBe('other');
    expect(template).toContain('answer: selectedChoice === "other" ? freeText : selectedChoice');
  });
});
