// Spec: docs/specs/with-artifact-skill.md

import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const template = readFileSync(
  new URL('../../skills/with-artifact/assets/grill-questionnaire.html', import.meta.url), 'utf8'
);
const skill = readFileSync(new URL('../../skills/with-artifact/SKILL.md', import.meta.url), 'utf8');

// Spec: docs/specs/with-artifact-skill.md via Copy answers
function mount(rows) {
  let click;
  const writes = [];
  const errors = [];
  const status = { textContent: '' };
  const questions = rows.map(([id, value, freeText]) => ({
    dataset: { id },
    querySelector: (selector) => {
      if (selector === 'input:checked') return value ? {
        value, closest: () => ({ querySelector: () => ({ textContent: 'PRIVATE OPTION LABEL' }) })
      } : null;
      if (selector === 'textarea') return { value: freeText };
      return { textContent: 'PRIVATE QUESTION BODY / recommendation / context / Mermaid' };
    }
  }));
  runInNewContext(template.match(/<script>([\s\S]*?)<\/script>/)[1], {
    document: {
      getElementById: (id) => id === 'copy-export' ? {
        addEventListener: (_event, handler) => { click = handler; }
      } : id === 'export-status' ? status : null,
      querySelectorAll: () => questions
    },
    navigator: { clipboard: { writeText: async (text) => { writes.push(text); } } },
    setTimeout: () => {},
    console: { error: (...args) => errors.push(args) }
  });
  return { click: () => click(), writes, errors, status };
}

describe('grill questionnaire minimal JSON clipboard', () => {
  it('preserves Other and the existing questionnaire widgets', () => {
    expect(skill).toContain('authoritative answer');
    expect(skill).toContain('minimal answers JSON only');
    for (const marker of ['id="frontier-lock"', 'data-mermaid-source', 'type="radio"', '<textarea', 'id="copy-export"']) {
      expect(template).toContain(marker);
    }
    expect([...template.matchAll(/<label class="choice-option[^\"]*" data-choice-id="([^"]+)"/g)].at(-1)[1]).toBe('other');
  });

  it.each([
    ['smallest-slice', '', { answer: 'smallest-slice' }],
    ['full-scope', '  Include mobile support.  ', { answer: 'full-scope', free_text: 'Include mobile support.' }],
    ['other', '  Start with a prototype.  ', { answer: 'other', free_text: 'Start with a prototype.' }],
    ['other', '  ', { answer: 'other' }],
    ['', '  Only free text.  ', { free_text: 'Only free text.' }],
    ['', ' \n ', undefined],
    ['option-"\\', '  Quote " / slash \\ / newline\n雪 / ```json  ', {
      answer: 'option-"\\', free_text: 'Quote " / slash \\ / newline\n雪 / ```json'
    }]
  ])('copies stable values and trimmed prose for %s', async (value, freeText, answer) => {
    const page = mount([['Q1', value, freeText], ['Q2', 'today', ''], ['Q3', '', '']]);
    const expected = { ...(answer ? { Q1: answer } : {}), Q2: { answer: 'today' } };
    await page.click();
    expect(page.writes).toEqual([JSON.stringify(expected)]);
    expect(JSON.parse(page.writes[0])).toEqual(expected);
    expect(page.writes[0]).not.toContain('PRIVATE');
    expect(page.status.textContent).toBe('✓ Copied answers');
    await page.click();
    expect(page.writes[1]).toBe(page.writes[0]);
  });

  it('copies an empty object when all questions are unanswered', async () => {
    const page = mount([['Q1', '', '   ']]);
    await page.click();
    expect(page.writes).toEqual(['{}']);
  });

  it('treats special property IDs as data without prototype leakage', async () => {
    const page = mount([['__proto__', 'safe', ''], ['constructor', '', ' note ']]);
    await page.click();
    expect(page.writes).toEqual(['{"__proto__":{"answer":"safe"},"constructor":{"free_text":"note"}}']);
  });

  it.each(['', ' ', ' Q2', 'Q 2', undefined, 'Q1'])('leaves clipboard untouched for invalid/duplicate ID %s', async (id) => {
    const page = mount([['Q1', 'selected', ''], [id, '', '']]);
    await page.click();
    expect(page.writes).toEqual([]);
    expect(page.errors).toHaveLength(1);
    expect(page.status.textContent).toBe('');
  });
});
