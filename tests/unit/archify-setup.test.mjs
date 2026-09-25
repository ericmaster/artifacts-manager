import { describe, it, expect } from 'vitest';
import { setupArchify } from '../../bin/archify-setup.mjs';

const release = { schemaVersion: 1, skillId: 'archify', channel: 'stable', version: '2.16.0', source: { repository: 'https://github.com/tt-a1i/archify' }, updateManifestUrl: 'https://tt-a1i.github.io/archify/skill-updates/archify/stable.json' };
const manifest = { schemaVersion: 1, skillId: 'archify', channel: 'stable', version: '2.16.0', source: { repository: release.source.repository, ref: 'v2.16.0', treeSha: 'a'.repeat(40) }, artifact: { sha256: 'b'.repeat(64) } };

function fixture(options = {}) {
  const calls = [], writes = [], renames = [], removed = [], messages = [], prompts = [];
  const answers = [...(options.answers ?? [])];
  let installed = options.installed ?? null;
  const home = '/tmp/opencode/archify-test-home';
  const registryPath = `${home}/.artifacts-manager.json`;
  const files = new Map(options.registry ? [[registryPath, JSON.stringify(options.registry)]] : []);
  const missing = () => Object.assign(new Error('missing'), { code: 'ENOENT' });
  const deps = {
    home, tty: options.tty ?? true, env: options.env ?? {},
    ask: async text => { prompts.push(text); return answers.shift() ?? ''; }, output: text => messages.push(text),
    run: (command, args) => {
      calls.push([command, args]);
      if (options.fail === 'npx' && args[0] === '--version') return { status: 1 };
      if (options.fail === 'skills' && args.includes('--help')) return { status: 1 };
      if (options.fail === 'installer' && args.includes('add')) return { status: 1 };
      if (args.includes('add')) installed = options.mismatch ? { ...release, version: '0.0.0' } : release;
      return { status: 0 };
    },
    fetch: async url => {
      if (options.fail === 'offline') throw new Error('offline');
      return { ok: true, json: async () => url.includes('stable.json') ? (options.manifest ?? manifest) : release };
    },
    fs: {
      lstat: async p => {
        if (options.destinationError) throw Object.assign(new Error('unreadable'), { code: 'EACCES' });
        if (installed || options.foreign) return { isDirectory: () => options.foreign !== 'symlink', isSymbolicLink: () => options.foreign === 'symlink' };
        throw missing();
      },
      realpath: async p => installed ? (p === `${home}/.agents/skills/archify` ? p : options.layout === 'direct' ? p : options.layout === 'alternate' ? `${home}/.local/share/skills/archify` : `${home}/.agents/skills/archify`) : Promise.reject(missing()),
      readFile: async p => {
        if (p.endsWith('skill-release.json')) {
          if (options.metadata === 'missing') throw missing();
          return options.metadata === 'malformed' ? '{invalid' : JSON.stringify(installed);
        }
        if (files.has(p)) return files.get(p);
        throw missing();
      },
      writeFile: async (p, data, config) => { writes.push([p, JSON.parse(data), config]); files.set(p, data); },
      rename: async (from, to) => {
        renames.push([from, to]);
        if (options.fail === 'rename') throw Object.assign(new Error('rename failed'), { code: 'EACCES' });
        files.set(to, files.get(from)); files.delete(from);
      },
      unlink: async p => { removed.push(p); files.delete(p); }
    }
  };
  return { deps, calls, writes, renames, removed, messages, prompts, files, registryPath };
}

describe('opt-in archify setup (no real HOME or global writes)', () => {
  it('defaults to No and skips non-TTY without explicit agent + consent', async () => {
    const declined = fixture({ answers: [''] });
    expect(await setupArchify([], declined.deps)).toBe(false);
    expect(declined.calls).toEqual([]);
    const noTTY = fixture({ tty: false });
    expect(await setupArchify([], noTTY.deps)).toBe(false);
    expect(noTTY.calls).toEqual([]);
    expect(noTTY.writes).toEqual([]);
  });

  it('detects one agent, confirms destination and installs pinned ref', async () => {
    const f = fixture({ env: { OPENCODE_SESSION_ID: '1' }, answers: ['y', 'y'] });
    expect(await setupArchify([], f.deps)).toBe(true);
    expect(f.calls.at(-1)).toEqual(['npx', ['--yes', 'skills', 'add', 'https://github.com/tt-a1i/archify/tree/v2.16.0', '--skill', 'archify', '--global', '--agent', 'opencode', '--yes']]);
    expect(f.writes[0][1].archify.opencode).toEqual({ version: '2.16.0', ref: 'v2.16.0' });
  });

  it.each([{}, { OPENCODE_SESSION_ID: '1', CLAUDECODE: '1' }])('asks when no/multiple agents match (%j)', async env => {
    const f = fixture({ env, answers: ['y', 'codex', 'y'] });
    expect(await setupArchify([], f.deps)).toBe(true);
    expect(f.calls.at(-1)[1]).toContain('codex');
    const skipped = fixture({ env, answers: ['y', ''] });
    expect(await setupArchify([], skipped.deps)).toBe(false);
    expect(skipped.calls).toEqual([]);
  });

  it.each(['npx', 'skills', 'installer', 'offline'])('soft fails %s without registry writes', async fail => {
    const f = fixture({ fail, tty: false });
    expect(await setupArchify(['--agent', 'codex', '--yes'], f.deps)).toBe(false);
    expect(f.writes).toEqual([]);
    expect(f.messages.join(' ')).toMatch(/Retry: artman setup/);
  });

  it.each([
    { ...manifest, channel: 'development' },
    { ...manifest, source: { ...manifest.source, ref: 'master' } },
    { ...manifest, artifact: { sha256: 'invalid' } }
  ])('rejects unstable or invalid manifest without invoking installer', async bad => {
    const f = fixture({ manifest: bad, tty: false });
    expect(await setupArchify(['--agent', 'codex', '--yes'], f.deps)).toBe(false);
    expect(f.calls).toEqual([]);
    expect(f.writes).toEqual([]);
  });

  it('rejects metadata mismatch without recording success', async () => {
    const f = fixture({ mismatch: true, tty: false });
    expect(await setupArchify(['--agent', 'codex', '--yes'], f.deps)).toBe(false);
    expect(f.writes).toEqual([]);
  });

  it.each(['direct', 'alternate'])('verifies installed release from a %s destination layout', async layout => {
    const f = fixture({ layout, tty: false });
    expect(await setupArchify(['--agent', 'codex', '--yes'], f.deps)).toBe(true);
    expect(f.calls.at(-1)[1]).toContain('add');
    expect(f.writes[0][1].archify.codex).toEqual({ version: '2.16.0', ref: 'v2.16.0' });
  });

  it.each(['missing', 'malformed'])('does not claim success for %s installed metadata', async metadata => {
    const f = fixture({ metadata, tty: false });
    expect(await setupArchify(['--agent', 'codex', '--yes'], f.deps)).toBe(false);
    expect(f.writes).toEqual([]);
    expect(f.messages.join(' ')).not.toContain('Verified Archify');
  });

  it('never updates installed agent implicitly, but accepts explicit update', async () => {
    const f = fixture({ installed: release, tty: false });
    expect(await setupArchify(['--agent', 'codex', '--yes'], f.deps)).toBe(false);
    expect(f.calls).toEqual([]);
    expect(await setupArchify(['--agent', 'codex', '--yes', '--update'], f.deps)).toBe(true);
    expect(f.calls.at(-1)[1]).toContain('add');
  });

  it.each([
    ['claude-code', '--yes'], ['--agent', 'codex', '--yes', 'unexpected'],
    ['--agent', 'unknown', '--yes'], ['--agent'], ['--wat'], ['--agent', 'codex', '--agent', 'opencode', '--yes']
  ])('rejects invalid args before detecting or running: %j', async (...args) => {
    const f = fixture({ env: { OPENCODE_SESSION_ID: '1' } });
    expect(await setupArchify(args, f.deps)).toBe(false);
    expect(f.calls).toEqual([]);
    expect(f.prompts).toEqual([]);
  });

  it.each(['directory', 'symlink'])('does not overwrite a foreign existing %s without explicit update', async foreign => {
    const f = fixture({ foreign, tty: false });
    expect(await setupArchify(['--agent', 'codex', '--yes'], f.deps)).toBe(false);
    expect(f.calls).toEqual([]);
    expect(await setupArchify(['--agent', 'codex', '--yes', '--update'], f.deps)).toBe(true);
    expect(f.calls.at(-1)[1]).toContain('add');
  });

  it('fails closed when destination existence cannot be checked, even with --update', async () => {
    const f = fixture({ destinationError: true, tty: false });
    expect(await setupArchify(['--agent', 'codex', '--yes', '--update'], f.deps)).toBe(false);
    expect(f.calls).toEqual([]);
  });

  it('preserves a populated registry via same-directory private temp and atomic rename', async () => {
    const registry = { version: '1.0.0', projects: [{ name: 'saved', path: '/projects/saved' }], custom: 'keep' };
    const f = fixture({ registry, tty: false });
    expect(await setupArchify(['--agent', 'codex', '--yes'], f.deps)).toBe(true);
    expect(f.writes).toHaveLength(1);
    const [temp, updated, config] = f.writes[0];
    expect(temp).not.toBe(f.registryPath);
    expect(temp.startsWith(`${f.registryPath}.`)).toBe(true);
    expect(config).toEqual({ mode: 0o600, flag: 'wx' });
    expect(f.renames).toEqual([[temp, f.registryPath]]);
    expect(updated).toEqual({ ...registry, archify: { codex: { version: '2.16.0', ref: 'v2.16.0' } } });
    expect(JSON.parse(f.files.get(f.registryPath))).toEqual(updated);
  });

  it('keeps the existing registry intact and cleans temp on rename failure', async () => {
    const registry = { version: '1.0.0', projects: [{ name: 'saved', path: '/projects/saved' }] };
    const f = fixture({ registry, fail: 'rename', tty: false });
    expect(await setupArchify(['--agent', 'codex', '--yes'], f.deps)).toBe(true);
    expect(JSON.parse(f.files.get(f.registryPath))).toEqual(registry);
    expect(f.removed).toEqual([f.writes[0][0]]);
    expect(f.messages.join(' ')).toMatch(/optional registry metadata could not be saved/);
  });

  it('requires destination/ref confirmation with TTY --yes and detected agent', async () => {
    const f = fixture({ env: { OPENCODE_SESSION_ID: '1' }, answers: [''] });
    expect(await setupArchify(['--yes'], f.deps)).toBe(false);
    expect(f.prompts.join(' ')).toContain('opencode');
    expect(f.prompts.join(' ')).toContain('v2.16.0');
    expect(f.prompts.join(' ')).toContain('/.config/opencode/skills/archify');
    expect(f.calls).toEqual([]);
  });
});
