// Spec: docs/specs/with-artifact-skill.md
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

// Spec: docs/specs/with-artifact-skill.md
function read(relative) {
  return readFileSync(new URL(relative, import.meta.url), 'utf8');
}

test('artifact generation gates storage, privacy and existing-catalog migration', () => {
  // Spec: docs/specs/with-artifact-skill.md
  const skill = read('../../skills/with-artifact/SKILL.md');
  const policy = skill.split('### Resolve storage before generation')[1].split('### `manifest.json`')[0];
  for (const required of ['outside Git worktrees', 'XDG_DATA_HOME', 'complete catalog/assets',
    'stable name/slug/IDs/createdAt', 'publication pending', 'not publication consent',
    '0700', '0600', 'source worktree free']) {
    expect(policy).toContain(required);
  }
  expect(skill).not.toContain('Artifacts are saved inside the current repository');
  const generator = read('../../skills/structurizr-artifact/SKILL.md');
  expect(generator).toContain('Load `with-artifact` section 2 before generation');
  expect(generator).toContain('Do not run the write mode against a source');
  expect(generator).toContain('private temporary input project');
  expect(generator).toContain('HOME=<private-scratch-home>');
  expect(generator).toContain('never the live viewer registry');
});
