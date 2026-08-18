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
