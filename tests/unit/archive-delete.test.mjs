import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { archiveArtifact, deleteArtifact, getArtifact, getProjectBySlug, saveCentralRegistry } from '../../src/lib/server/registry.ts';

const execFileAsync = promisify(execFile);
const roots = [];
const originalRegistryPath = path.join(os.homedir(), '.artifacts-manager.json');
let backupRegistryContent = null;

beforeEach(async () => {
  try {
    backupRegistryContent = await fs.readFile(originalRegistryPath, 'utf-8');
  } catch {
    backupRegistryContent = null;
  }
});

afterEach(async () => {
  // Restore original central registry
  if (backupRegistryContent !== null) {
    await fs.writeFile(originalRegistryPath, backupRegistryContent, 'utf-8');
  }
  // Clean up temporary fixture directories
  await Promise.all(roots.splice(0).map((r) => fs.rm(r, { recursive: true, force: true })));
});

async function createProjectFixture({ name = 'test-project', artifacts = [] } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'artman-test-proj-'));
  roots.push(root);
  const artifactsDir = path.join(root, '.artifacts-manager');
  await fs.mkdir(artifactsDir, { recursive: true });

  for (const art of artifacts) {
    if (art.file) {
      await fs.writeFile(path.join(artifactsDir, art.file), `<html><body>${art.title}</body></html>`);
    }
  }

  const manifest = {
    version: '1.0.0',
    projectName: name,
    description: 'Test project description',
    artifacts
  };

  await fs.writeFile(path.join(artifactsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Register in central registry
  const registry = {
    version: '1.0.0',
    projects: [
      {
        name,
        path: root,
        registeredAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      }
    ]
  };
  await saveCentralRegistry(registry);

  return { root, name, artifactsDir };
}

test('archiveArtifact sets archived flag, timestamp and updatedAt', async () => {
  const { name } = await createProjectFixture({
    name: 'archive-test',
    artifacts: [
      {
        id: 'arch-1',
        title: 'Archivable Artifact',
        type: 'html',
        file: 'arch-1.html',
        description: 'Test artifact',
        tags: ['test'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ]
  });

  const updated = await archiveArtifact('archive-test', 'arch-1', true);
  expect(updated.archived).toBe(true);
  expect(updated.archivedAt).toBeDefined();
  expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(new Date('2026-01-01T00:00:00.000Z').getTime());

  // Check project summary counts
  const proj = await getProjectBySlug('archive-test');
  expect(proj?.artifactCount).toBe(1);
  expect(proj?.activeArtifactCount).toBe(0);
  expect(proj?.archivedArtifactCount).toBe(1);
});

test('archiveArtifact with false restores artifact to active status', async () => {
  const { name } = await createProjectFixture({
    name: 'restore-test',
    artifacts: [
      {
        id: 'arch-2',
        title: 'Restorable Artifact',
        type: 'html',
        file: 'arch-2.html',
        description: 'Test artifact',
        tags: ['test'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        archived: true,
        archivedAt: '2026-01-02T00:00:00.000Z'
      }
    ]
  });

  const restored = await archiveArtifact('restore-test', 'arch-2', false);
  expect(restored.archived).toBe(false);
  expect(restored.archivedAt).toBeUndefined();

  const proj = await getProjectBySlug('restore-test');
  expect(proj?.activeArtifactCount).toBe(1);
  expect(proj?.archivedArtifactCount).toBe(0);
});

test('deleteArtifact removes entry from manifest and unlinks file by default', async () => {
  const { root, artifactsDir } = await createProjectFixture({
    name: 'delete-test',
    artifacts: [
      {
        id: 'del-1',
        title: 'Deletable Artifact',
        type: 'html',
        file: 'del-1.html',
        description: 'Test artifact',
        tags: ['test'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'keep-1',
        title: 'Keep Artifact',
        type: 'html',
        file: 'keep-1.html',
        description: 'Remaining',
        tags: ['test'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ]
  });

  const filePath = path.join(artifactsDir, 'del-1.html');
  expect(await fs.stat(filePath).then(() => true).catch(() => false)).toBe(true);

  const result = await deleteArtifact('delete-test', 'del-1', true);
  expect(result.success).toBe(true);
  expect(result.deletedArtifactId).toBe('del-1');

  // File on disk must be removed
  expect(await fs.stat(filePath).then(() => true).catch(() => false)).toBe(false);

  // Manifest should only have keep-1
  const proj = await getProjectBySlug('delete-test');
  expect(proj?.artifacts.length).toBe(1);
  expect(proj?.artifacts[0].id).toBe('keep-1');
});

test('deleteArtifact with deleteFile: false keeps file on disk', async () => {
  const { artifactsDir } = await createProjectFixture({
    name: 'delete-keep-file-test',
    artifacts: [
      {
        id: 'del-2',
        title: 'Deletable Manifest Only',
        type: 'html',
        file: 'del-2.html',
        description: 'Test artifact',
        tags: ['test'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ]
  });

  const filePath = path.join(artifactsDir, 'del-2.html');
  const result = await deleteArtifact('delete-keep-file-test', 'del-2', false);
  expect(result.success).toBe(true);

  // File still on disk
  expect(await fs.stat(filePath).then(() => true).catch(() => false)).toBe(true);

  // Manifest entry removed
  const proj = await getProjectBySlug('delete-keep-file-test');
  expect(proj?.artifacts.length).toBe(0);
});

test('CLI artman archive, restore, and delete commands work', async () => {
  const { root } = await createProjectFixture({
    name: 'cli-test',
    artifacts: [
      {
        id: 'cli-art',
        title: 'CLI Target Artifact',
        type: 'html',
        file: 'cli-art.html',
        description: 'CLI Test',
        tags: ['test'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ]
  });

  const binPath = path.resolve('bin/artman');

  // 1. Archive via CLI
  const { stdout: archiveOut } = await execFileAsync('node', [binPath, 'archive', 'cli-art', '--project', root]);
  expect(archiveOut).toContain('Archived artifact');

  let manifest = JSON.parse(await fs.readFile(path.join(root, '.artifacts-manager', 'manifest.json'), 'utf-8'));
  expect(manifest.artifacts[0].archived).toBe(true);

  // 2. Restore via CLI
  const { stdout: restoreOut } = await execFileAsync('node', [binPath, 'restore', 'cli-art', '--project', root]);
  expect(restoreOut).toContain('Restored artifact');

  manifest = JSON.parse(await fs.readFile(path.join(root, '.artifacts-manager', 'manifest.json'), 'utf-8'));
  expect(manifest.artifacts[0].archived).toBe(false);

  // 3. Delete via CLI
  const { stdout: deleteOut } = await execFileAsync('node', [binPath, 'delete', 'cli-art', '--project', root]);
  expect(deleteOut).toContain('Deleted artifact');

  manifest = JSON.parse(await fs.readFile(path.join(root, '.artifacts-manager', 'manifest.json'), 'utf-8'));
  expect(manifest.artifacts.length).toBe(0);
  expect(await fs.stat(path.join(root, '.artifacts-manager', 'cli-art.html')).then(() => true).catch(() => false)).toBe(false);
});
