import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { expect, test } from 'vitest';

const cli = fileURLToPath(new URL('../../bin/artman', import.meta.url));

test('CLI help bypasses add/validate handlers without writing state', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'artman-help-'));
  const home = path.join(root, 'home');
  const cwd = path.join(root, 'project');
  await fs.mkdir(home);
  await fs.mkdir(cwd);
  try {
    const cases = [
      [[], 0, /Artifacts Manager CLI/],
      [['help'], 0, /Artifacts Manager CLI/],
      ...['-h', '--help'].flatMap(flag => [
        [[flag], 0, /Artifacts Manager CLI/],
        [['add', flag], 0, /Options for 'add'/],
        [['add', '--file', 'demo.html', '--title', 'Demo', flag], 0, /Options for 'add'/],
        [['validate', flag], 0, /validate/],
        [['validate', '--all', '--project', cwd, flag], 0, /Artifacts Manager CLI/],
        [['setup', flag], 0, /--update/],
        [['unknown-command', flag], 1, /Unknown command/],
      ]),
      [['add'], 1, /Both --file and --title are required/],
      [['validate'], 1, /use exactly one/],
      [['validate', '--all', '--project', cwd], 1, /use exactly one/],
      [['unknown-command'], 1, /Unknown command/],
    ];
    for (const [args, status, output] of cases) {
      const result = spawnSync(process.execPath, [cli, ...args], {
        cwd, env: { ...process.env, HOME: home }, encoding: 'utf8', timeout: 10000,
      });
      expect(result.error, args.join(' ')).toBeUndefined();
      expect(result.status, args.join(' ')).toBe(status);
      expect(result.stdout + result.stderr, args.join(' ')).toMatch(output);
      expect(await fs.readdir(home), args.join(' ')).toEqual([]);
      expect(await fs.readdir(cwd), args.join(' ')).toEqual([]);
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}, 30000);
