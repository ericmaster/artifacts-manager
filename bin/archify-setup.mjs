import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { randomUUID } from 'node:crypto';

const manifestUrl = 'https://tt-a1i.github.io/archify/skill-updates/archify/stable.json';
const repository = 'https://github.com/tt-a1i/archify';
const destinations = {
  opencode: '.config/opencode/skills/archify',
  'claude-code': '.claude/skills/archify',
  codex: '.codex/skills/archify'
};

export const setupHelp = `artman setup [--agent opencode|claude-code|codex --yes] [--update]
Optional Archify skill installation; npm install never installs Archify.
Interactive setup defaults to No. Without a TTY, pass both --agent and --yes for explicit CI consent.
--update explicitly replaces an existing skill (never updates implicitly).
The stable manifest at ${manifestUrl} is fetched over the network;
the announced GitHub tag is installed with npx skills add. No development/master fallback.
Decline, offline, missing npx, invalid release or installer failure leave the hub usable.
Retry with artman setup once connectivity or tooling is restored; check installed release before retrying.
`;

function validRelease(m) {
  return m?.schemaVersion === 1 && m.skillId === 'archify' && m.channel === 'stable' &&
    /^\d+\.\d+\.\d+$/.test(m.version) && m.source?.repository === repository &&
    m.source.ref === `v${m.version}` && /^[a-f0-9]{40}$/.test(m.source.treeSha) &&
    /^[a-f0-9]{64}$/.test(m.artifact?.sha256);
}

function detect(env) {
  return Object.keys(destinations).filter(agent => ({
    opencode: !!env.OPENCODE_SESSION_ID,
    'claude-code': !!env.CLAUDECODE,
    codex: !!env.CODEX_THREAD_ID
  })[agent]);
}

async function installed(home, agent, io) {
  try {
    const destination = path.join(home, destinations[agent]);
    return JSON.parse(await io.readFile(path.join(destination, 'skill-release.json'), 'utf8'));
  } catch { return null; }
}

// Dependencies are injectable so tests never invoke a real global installer.
export async function setupArchify(args, deps = {}) {
  const home = deps.home ?? os.homedir();
  const io = deps.fs ?? fs;
  const env = deps.env ?? process.env;
  const tty = deps.tty ?? (process.stdin.isTTY && process.stdout.isTTY);
  const output = deps.output ?? console.log;
  const run = deps.run ?? ((command, argv) => spawnSync(command, argv, { encoding: 'utf8', timeout: 120000, env: { ...process.env, HOME: home } }));
  const fetcher = deps.fetch ?? fetch;
  let rl;
  const ask = deps.ask ?? (async text => {
    rl ??= createInterface({ input: process.stdin, output: process.stdout });
    return rl.question(text);
  });
  const skip = message => { output(`${message} Artifacts Manager remains usable. Retry: artman setup.`); return false; };
  try {
    const agentArg = args.indexOf('--agent');
    const agent = agentArg < 0 ? undefined : args[agentArg + 1];
    if (args.some((arg, i) => !['--agent', '--yes', '--update'].includes(arg) && !(agentArg >= 0 && i === agentArg + 1)) ||
        args.filter(arg => arg === '--agent').length > 1 ||
        (agentArg >= 0 && !Object.hasOwn(destinations, agent))) return skip('Invalid setup option or agent. See artman setup --help.');
    if (!tty && (!agent || !args.includes('--yes'))) return skip('No TTY: use --agent <agent> --yes for explicit consent.');
    if (!args.includes('--yes') && !/^y(es)?$/i.test((await ask('Install optional Archify skill? [y/N] ')).trim())) return skip('Archify declined.');
    let selected = agent;
    if (!selected) {
      const matches = detect(env);
      if (matches.length === 1) selected = matches[0];
      else {
        const answer = (await ask(`Select agent (${Object.keys(destinations).join(', ')}; Enter skips): `)).trim();
        if (!answer) return skip('No agent selected.');
        if (!Object.hasOwn(destinations, answer)) return skip('Unsupported agent selected.');
        selected = answer;
      }
    }
    const destination = path.join(home, destinations[selected]);
    let exists;
    try { await io.lstat(destination); exists = true; }
    catch (err) {
      if (err.code !== 'ENOENT') return skip(`Cannot inspect ${destination} (${err.message}); refusing installation.`);
      exists = false;
    }
    if (exists && !args.includes('--update')) return skip(`Archify destination already exists for ${selected}; no implicit update. Use --update to replace it.`);
    let manifest;
    try {
      const response = await fetcher(manifestUrl, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      manifest = await response.json();
    } catch (err) { return skip(`Stable manifest unavailable (${err.message}). Check network.`); }
    if (!validRelease(manifest)) return skip('Invalid stable manifest (channel, ref, version or SHA); refusing development release.');
    if ((!args.includes('--yes') || (tty && !agent)) && !/^y(es)?$/i.test((await ask(`Install Archify ${manifest.version} (${manifest.source.ref}) for ${selected} at ${destination}? [y/N] `)).trim())) return skip('Destination/ref not confirmed.');
    output(`Installing stable Archify ${manifest.version} (${manifest.source.ref}) for ${selected} at ${destination}.`);
    const npx = run('npx', ['--version']);
    if (npx.error || npx.status !== 0) return skip('npx unavailable. Install Node.js/npm and retry.');
    const skills = run('npx', ['--yes', 'skills', '--help']);
    if (skills.error || skills.status !== 0) return skip('skills CLI unavailable. Check network/npm and retry.');
    const source = `${repository}/tree/${manifest.source.ref}`;
    const result = run('npx', ['--yes', 'skills', 'add', source, '--skill', 'archify', '--global', '--agent', selected, '--yes']);
    if (result.error || result.status !== 0) return skip('skills add failed. Check network/permissions, inspect destination, then retry.');
    const release = await installed(home, selected, io);
    // Upstream release metadata has no ref field: compare it against the metadata at the pinned ref.
    let pinned;
    try {
      const response = await fetcher(`https://raw.githubusercontent.com/tt-a1i/archify/${manifest.source.ref}/archify/skill-release.json`, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      pinned = await response.json();
    } catch (err) { return skip(`Cannot verify pinned release (${err.message}). Inspect destination and retry.`); }
    if (!release || release.version !== manifest.version || pinned.version !== manifest.version ||
        JSON.stringify(release) !== JSON.stringify(pinned) || release.channel !== 'stable' || release.skillId !== 'archify')
      return skip('Installed release metadata does not match stable pinned ref/version. Inspect destination and retry.');
    // The registry metadata is optional; never affect project catalogs or claim failure after verified install.
    try {
      const registryPath = path.join(home, '.artifacts-manager.json');
      let registry;
      try { registry = JSON.parse(await io.readFile(registryPath, 'utf8')); }
      catch (err) { if (err.code !== 'ENOENT') throw err; registry = { version: '1.0.0', projects: [] }; }
      registry.archify ??= {};
      registry.archify[selected] = { version: release.version, ref: manifest.source.ref };
       const tempPath = `${registryPath}.${randomUUID()}.tmp`;
       try {
         await io.writeFile(tempPath, JSON.stringify(registry, null, 2), { mode: 0o600, flag: 'wx' });
         await io.rename(tempPath, registryPath);
       } catch (err) {
         try { await io.unlink(tempPath); } catch { /* no temp to clean */ }
         throw err;
       }
    } catch { output('Verified installation; optional registry metadata could not be saved.'); }
    output(`Verified Archify ${release.version} for ${selected} from ${manifest.source.ref}.`);
    return true;
  } finally { rl?.close(); }
}
