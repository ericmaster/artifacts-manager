// Spec: docs/specs/artifacts-manager-core.md
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { CentralRegistry, ProjectManifest, ProjectSummary, ArtifactDetail, RegisteredProject, ArtifactMeta } from '$lib/types';

const REGISTRY_PATH = path.join(os.homedir(), '.artifacts-manager.json');

/**
 * Normalizes a project name or path into a URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Expands '~' in a filepath to the user's home directory.
 */
export function expandHome(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return path.resolve(filePath);
}

/**
 * Reads the central registry from ~/.artifacts-manager.json.
 * Creates it if it doesn't exist.
 */
export async function getCentralRegistry(): Promise<CentralRegistry> {
  try {
    const data = await fs.readFile(REGISTRY_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      const initial: CentralRegistry = {
        version: '1.0.0',
        projects: []
      };
      await fs.writeFile(REGISTRY_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    console.error('Error reading central registry:', err);
    return { version: '1.0.0', projects: [] };
  }
}

/**
 * Saves the central registry to ~/.artifacts-manager.json.
 */
export async function saveCentralRegistry(registry: CentralRegistry): Promise<void> {
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8');
}

/**
 * Reads a project's manifest from <project-root>/.artifacts-manager/manifest.json.
 */
export async function getProjectManifest(projectPath: string): Promise<ProjectManifest | null> {
  const manifestPath = path.join(projectPath, '.artifacts-manager', 'manifest.json');
  try {
    const data = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(data);
  } catch (err: any) {
    return null;
  }
}

/**
 * Saves a project's manifest to <project-root>/.artifacts-manager/manifest.json.
 */
export async function saveProjectManifest(projectPath: string, manifest: ProjectManifest): Promise<void> {
  const fullPath = expandHome(projectPath);
  const dir = path.join(fullPath, '.artifacts-manager');
  await fs.mkdir(dir, { recursive: true });
  const manifestPath = path.join(dir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

/**
 * Lists all registered projects with their artifact counts, tags, and status.
 */
export async function getAllProjects(): Promise<ProjectSummary[]> {
  const registry = await getCentralRegistry();
  const summaries: ProjectSummary[] = [];

  for (const proj of registry.projects) {
    const fullPath = expandHome(proj.path);
    let exists = false;
    try {
      const stat = await fs.stat(fullPath);
      exists = stat.isDirectory();
    } catch {
      exists = false;
    }

    const manifest = exists ? await getProjectManifest(fullPath) : null;
    const artifacts = manifest?.artifacts || [];
    const activeArtifacts = artifacts.filter(a => !a.archived);
    const archivedArtifacts = artifacts.filter(a => !!a.archived);
    
    // Extract unique tags
    const tagSet = new Set<string>();
    for (const art of artifacts) {
      if (Array.isArray(art.tags)) {
        for (const t of art.tags) {
          tagSet.add(t.toLowerCase());
        }
      }
    }

    const name = proj.name || manifest?.projectName || path.basename(fullPath);
    const slug = slugify(name) || slugify(path.basename(fullPath));

    summaries.push({
      name,
      slug,
      path: fullPath,
      exists,
      hasManifest: !!manifest,
      description: manifest?.description,
      artifactCount: artifacts.length,
      activeArtifactCount: activeArtifacts.length,
      archivedArtifactCount: archivedArtifacts.length,
      tags: Array.from(tagSet).sort(),
      artifacts,
      registeredAt: proj.registeredAt || new Date().toISOString(),
      lastActiveAt: proj.lastActiveAt || (artifacts.length > 0 ? artifacts[0].updatedAt : proj.registeredAt)
    });
  }

  // Sort by last active timestamp descending
  return summaries.sort((a, b) => {
    const timeA = new Date(a.lastActiveAt || a.registeredAt).getTime();
    const timeB = new Date(b.lastActiveAt || b.registeredAt).getTime();
    return timeB - timeA;
  });
}

/**
 * Retrieves a single project summary by slug or name.
 */
export async function getProjectBySlug(slug: string): Promise<ProjectSummary | null> {
  const projects = await getAllProjects();
  const match = projects.find(p => p.slug === slug || slugify(p.name) === slug);
  return match || null;
}

/**
 * Retrieves a specific artifact detail by project slug and artifact ID.
 */
export async function getArtifact(projectSlug: string, artifactId: string): Promise<ArtifactDetail | null> {
  const project = await getProjectBySlug(projectSlug);
  if (!project || !project.exists) return null;

  const artifact = project.artifacts.find(a => a.id === artifactId || slugify(a.title) === artifactId);
  if (!artifact) return null;

  const artifactFilePath = path.join(project.path, '.artifacts-manager', artifact.file);
  let rawContent: string | undefined;

  try {
    rawContent = await fs.readFile(artifactFilePath, 'utf-8');
  } catch (err) {
    console.warn(`Could not read artifact file: ${artifactFilePath}`, err);
  }

  return {
    ...artifact,
    projectSlug: project.slug,
    projectName: project.name,
    projectPath: project.path,
    rawUrl: `/api/raw/${project.slug}/${artifact.file}`,
    rawContent
  };
}

/**
 * Resolves an absolute path to a raw artifact asset while preventing directory traversal attacks.
 */
export async function getSafeRawAssetPath(projectSlug: string, relativeFile: string): Promise<string | null> {
  const project = await getProjectBySlug(projectSlug);
  if (!project || !project.exists) return null;

  const artifactsDir = path.resolve(project.path, '.artifacts-manager');
  const targetPath = path.resolve(artifactsDir, relativeFile);

  // Security check: Target must reside strictly within artifactsDir
  if (!targetPath.startsWith(artifactsDir)) {
    console.warn(`Security alert: Directory traversal attempt detected: ${relativeFile}`);
    return null;
  }

  try {
    await fs.access(targetPath);
    return targetPath;
  } catch {
    return null;
  }
}

/**
 * Registers a new project or updates an existing one in ~/.artifacts-manager.json.
 */
export async function registerProject(projectPath: string, customName?: string): Promise<ProjectSummary> {
  const fullPath = expandHome(projectPath);
  const registry = await getCentralRegistry();

  const manifest = await getProjectManifest(fullPath);
  const name = customName || manifest?.projectName || path.basename(fullPath);

  const existingIdx = registry.projects.findIndex(p => expandHome(p.path) === fullPath);
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    registry.projects[existingIdx].name = name;
    registry.projects[existingIdx].lastActiveAt = now;
  } else {
    registry.projects.push({
      name,
      path: fullPath,
      registeredAt: now,
      lastActiveAt: now
    });
  }

  await saveCentralRegistry(registry);

  const summary = await getProjectBySlug(slugify(name));
  if (!summary) {
    throw new Error(`Failed to resolve registered project: ${name}`);
  }
  return summary;
}

/**
 * Archives or unarchives an artifact in a project's manifest.
 */
export async function archiveArtifact(
  projectSlug: string,
  artifactId: string,
  archived = true
): Promise<ArtifactDetail> {
  const project = await getProjectBySlug(projectSlug);
  if (!project || !project.exists) {
    throw new Error(`Project not found: ${projectSlug}`);
  }

  const manifest = await getProjectManifest(project.path);
  if (!manifest) {
    throw new Error(`Project manifest not found for: ${project.name}`);
  }

  const idx = manifest.artifacts.findIndex(a => a.id === artifactId || slugify(a.title) === artifactId);
  if (idx < 0) {
    throw new Error(`Artifact not found: ${artifactId} in project ${projectSlug}`);
  }

  const now = new Date().toISOString();
  const art = manifest.artifacts[idx];
  art.archived = archived;
  if (archived) {
    art.archivedAt = now;
  } else {
    delete art.archivedAt;
  }
  art.updatedAt = now;

  await saveProjectManifest(project.path, manifest);

  // Update lastActiveAt in central registry
  const registry = await getCentralRegistry();
  const pIdx = registry.projects.findIndex(p => expandHome(p.path) === project.path);
  if (pIdx >= 0) {
    registry.projects[pIdx].lastActiveAt = now;
    await saveCentralRegistry(registry);
  }

  const updated = await getArtifact(project.slug, art.id);
  if (!updated) {
    throw new Error(`Failed to retrieve updated artifact: ${art.id}`);
  }
  return updated;
}

/**
 * Deletes an artifact from a project's manifest and optionally removes the file from disk.
 */
export async function deleteArtifact(
  projectSlug: string,
  artifactId: string,
  deleteFile = true
): Promise<{ success: boolean; deletedArtifactId: string; deletedFile?: string }> {
  const project = await getProjectBySlug(projectSlug);
  if (!project || !project.exists) {
    throw new Error(`Project not found: ${projectSlug}`);
  }

  const manifest = await getProjectManifest(project.path);
  if (!manifest) {
    throw new Error(`Project manifest not found for: ${project.name}`);
  }

  const idx = manifest.artifacts.findIndex(a => a.id === artifactId || slugify(a.title) === artifactId);
  if (idx < 0) {
    throw new Error(`Artifact not found: ${artifactId} in project ${projectSlug}`);
  }

  const art = manifest.artifacts[idx];
  const targetFileName = art.file;

  if (deleteFile && targetFileName) {
    const artifactsDir = path.resolve(project.path, '.artifacts-manager');
    const targetFilePath = path.resolve(artifactsDir, targetFileName);

    // Security check: Target must reside strictly within artifactsDir
    if (!targetFilePath.startsWith(artifactsDir + path.sep) && targetFilePath !== artifactsDir) {
      throw new Error(`Security alert: Directory traversal attempt detected during deletion: ${targetFileName}`);
    }

    try {
      await fs.unlink(targetFilePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.warn(`Warning: Could not delete artifact file ${targetFilePath}:`, err);
      }
    }
  }

  manifest.artifacts.splice(idx, 1);
  await saveProjectManifest(project.path, manifest);

  const now = new Date().toISOString();
  const registry = await getCentralRegistry();
  const pIdx = registry.projects.findIndex(p => expandHome(p.path) === project.path);
  if (pIdx >= 0) {
    registry.projects[pIdx].lastActiveAt = now;
    await saveCentralRegistry(registry);
  }

  return {
    success: true,
    deletedArtifactId: art.id,
    deletedFile: targetFileName
  };
}

