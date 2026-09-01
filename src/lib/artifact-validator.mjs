import fs from 'node:fs/promises';
import path from 'node:path';
import DOMPurify from 'dompurify';

// Mermaid's parser imports the browser DOMPurify surface even when no rendering
// occurs. Supply only the parser-time hooks that are absent from Node's factory.
DOMPurify.addHook ??= () => {};
DOMPurify.removeAllHooks ??= () => {};
DOMPurify.sanitize ??= (value) => value;

const { default: mermaid } = await import('mermaid');

export const TAILWIND_URL = 'https://cdn.tailwindcss.com/3.4.17';
export const MERMAID_URL = 'https://cdn.jsdelivr.net/npm/mermaid@11.17.1/dist/mermaid.esm.min.mjs';

// These are the migration invariants. New artifacts remain schema-validated,
// while changing a migrated artifact's identity needs an intentional contract update.
export const MIGRATED_ARTIFACTS = new Map([
  ['artifacts-manager:artifacts-manager-topology', ['artifacts-manager-topology.html', '2026-08-18T20:30:52.864Z']],
  ['artifacts-manager:with-artifact-skill-guide', ['with-artifact-guide.md', '2026-08-18T20:31:00.595Z']],
  ['nimbler-ops:nimbler-ops-orchestrator-flow', ['orchestrator-topology.html', '2026-08-18T20:31:10.977Z']],
  ['nimbler-ops:planner-agent-workflow-hook-architecture', ['planner-workflow-topology.html', '2026-08-23T20:28:36.830Z']],
  ['nimbler-ops:agent-hooks-architecture-deepening-opportunities', ['agent-hooks-architecture-review.html', '2026-08-24T12:52:04.797Z']],
  ['agentic-inbox:cloudflare-resend-wiring-architecture', ['cloudflare-resend-wiring.html', '2026-08-19T14:52:24.941Z']],
  ['nimblerbot:whatsapp-qualified-demo-access', ['2026-08-19-whatsapp-demo-access-visual.html', '2026-08-19T22:03:13.257Z']],
  ['vespera:kth-irl-self-evaluation', ['kth-irl-self-evaluation.html', '2026-08-20T16:00:16.921Z']],
  ['vespera:protocol-specs-vs-implementation-gaps', ['protocol-gaps-review.html', '2026-08-20T16:29:46.943Z']],
  ['vespera:protocol-product-specification-plan', ['protocol-product-specification-plan.html', '2026-08-20T17:44:00.389Z']]
]);

const KTH_CHART_KEY = 'vespera:kth-irl-self-evaluation';

function lineOf(text, search) {
  const index = text.indexOf(search);
  return index < 0 ? 1 : text.slice(0, index).split('\n').length;
}

function issue(project, file, rule, message, line = 1) {
  return { project, file, rule, message, line };
}

async function artifactFiles(directory, prefix = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'manifest.json') continue;
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await artifactFiles(path.join(directory, entry.name), relative));
    if (entry.isFile() && /\.(html|md)$/i.test(entry.name)) files.push(relative);
  }
  return files;
}

function hasMermaidFallback(content) {
  return /class\s*=\s*["'][^"']*\bmermaid\b[^"']*["']/i.test(content)
    && /data-mermaid-source(?:\s|=|>)/i.test(content);
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, digits) => String.fromCodePoint(Number.parseInt(digits, 16)))
    .replace(/&#(\d+);/g, (_, digits) => String.fromCodePoint(Number.parseInt(digits, 10)))
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
}

function mermaidSources(content) {
  const sources = [];
  const pattern = /data-mermaid-source\s*=\s*(["'])([\s\S]*?)\1/gi;
  for (const match of content.matchAll(pattern)) {
    sources.push({ source: decodeHtmlEntities(match[2]), line: lineOf(content, match[0]) });
  }
  return sources;
}

function isDecorativeIcon(svg) {
  return /aria-hidden\s*=\s*["']true["']/i.test(svg)
    || /\bviewBox\s*=\s*["']0\s+0\s+(?:[0-2]?\d|3[0-2])\s+(?:[0-2]?\d|3[0-2])["']/i.test(svg)
    || (/\bwidth\s*=\s*["']?(?:[0-2]?\d|3[0-2])["']?/i.test(svg)
      && /\bheight\s*=\s*["']?(?:[0-2]?\d|3[0-2])["']?/i.test(svg));
}

function staticSvgTags(content) {
  return content.match(/<svg\b[^>]*>/gi) ?? [];
}

export async function validateProject(projectPath) {
  const fullProjectPath = path.resolve(projectPath);
  const manifestPath = path.join(fullProjectPath, '.artifacts-manager', 'manifest.json');
  const project = path.basename(fullProjectPath);
  const errors = [];
  const warnings = [];
  let manifest;

  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch (error) {
    return { project, errors: [issue(project, '.artifacts-manager/manifest.json', 'manifest-readable', `cannot read manifest: ${error.message}`)], warnings };
  }

  const projectName = typeof manifest.projectName === 'string' ? manifest.projectName : project;
  const artifactsDir = path.resolve(fullProjectPath, '.artifacts-manager');
  const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
  const expectedMigrations = [...MIGRATED_ARTIFACTS.entries()]
    .filter(([key]) => key.startsWith(`${project}:`));
  const cataloguedFiles = new Set();
  const ids = new Set();

  if (!Array.isArray(manifest.artifacts)) {
    errors.push(issue(projectName, 'manifest.json', 'manifest-artifacts', 'artifacts must be an array'));
  }

  if (expectedMigrations.length && projectName !== project) {
    errors.push(issue(project, 'manifest.json', 'migration-project', `migrated projectName must match registered project path: ${project}`));
  }

  for (const artifact of artifacts) {
    const file = typeof artifact.file === 'string' ? artifact.file : '';
    const displayFile = file || 'manifest.json';
    if (!artifact.id || !file || !artifact.createdAt) {
      errors.push(issue(projectName, displayFile, 'manifest-identity', 'id, file, and createdAt are required'));
      continue;
    }
    if (ids.has(artifact.id)) errors.push(issue(projectName, displayFile, 'manifest-id-unique', `duplicate artifact id: ${artifact.id}`));
    ids.add(artifact.id);
    if (path.isAbsolute(file) || file.split(/[\\/]+/).includes('..')) {
      errors.push(issue(projectName, displayFile, 'file-contained', 'manifest file escapes .artifacts-manager'));
      continue;
    }

    const artifactPath = path.resolve(artifactsDir, file);
    if (!artifactPath.startsWith(`${artifactsDir}${path.sep}`)) {
      errors.push(issue(projectName, displayFile, 'file-contained', 'manifest file escapes .artifacts-manager'));
      continue;
    }
    cataloguedFiles.add(file.split(path.sep).join('/'));
    let content;
    try {
      content = await fs.readFile(artifactPath, 'utf8');
    } catch {
      errors.push(issue(projectName, displayFile, 'file-exists', 'manifest entry has no readable file'));
      continue;
    }

    const key = `${projectName}:${artifact.id}`;
    const expected = MIGRATED_ARTIFACTS.get(`${project}:${artifact.id}`);
    if (expected && (artifact.file !== expected[0] || artifact.createdAt !== expected[1])) {
      errors.push(issue(projectName, displayFile, 'migration-identity', 'migrated id, file, and createdAt must match the contract'));
    }

    if (artifact.type === 'html') {
      if (!content.includes(TAILWIND_URL)) {
        errors.push(issue(projectName, displayFile, 'tailwind-url', `missing exact Tailwind URL: ${TAILWIND_URL}`, lineOf(content, '<head')));
      }

      if (key === KTH_CHART_KEY) {
        const canvases = content.match(/<canvas\b[^>]*>/gi) ?? [];
        if (canvases.length !== 1 || !/\bid\s*=\s*["']radar["']/i.test(canvases[0])) {
          errors.push(issue(projectName, displayFile, 'kth-chart-allowlist', 'only canvas#radar is allowed for the specialized chart', lineOf(content, '<canvas')));
        }
        for (const svg of staticSvgTags(content)) {
          if (!isDecorativeIcon(svg)) errors.push(issue(projectName, displayFile, 'kth-chart-allowlist', 'only decorative icon SVGs are allowed beside canvas#radar', lineOf(content, svg)));
        }
      }

      for (const svg of staticSvgTags(content)) {
        if (key !== KTH_CHART_KEY && !isDecorativeIcon(svg)) {
          warnings.push(issue(projectName, displayFile, 'legacy-static-svg', 'non-icon static SVG may be hand-authored graph markup; use Mermaid or document an allowlist', lineOf(content, svg)));
        }
      }
    }
    if (Array.isArray(artifact.tags) && artifact.tags.includes('mermaid')) {
      if (!content.includes(MERMAID_URL)) {
        errors.push(issue(projectName, displayFile, 'mermaid-url', `missing exact Mermaid URL: ${MERMAID_URL}`, lineOf(content, '<script')));
      }
      if (!hasMermaidFallback(content)) {
        errors.push(issue(projectName, displayFile, 'mermaid-fallback', 'Mermaid artifacts need class="mermaid" and data-mermaid-source fallback source', lineOf(content, '<body')));
      }
      for (const { source, line } of mermaidSources(content)) {
        try {
          await mermaid.parse(source);
        } catch (error) {
          const message = String(error?.message ?? error).replace(/\s+/g, ' ').trim();
          errors.push(issue(projectName, displayFile, 'mermaid-syntax', message, line));
        }
      }
    }
  }

  for (const [key, [file, createdAt]] of expectedMigrations) {
    const id = key.slice(project.length + 1);
    const artifact = artifacts.find((entry) => entry?.id === id);
    if (!artifact) {
      errors.push(issue(project, 'manifest.json', 'migration-entry', `missing migrated artifact entry: ${id}`));
    } else if (artifact.file !== file || artifact.createdAt !== createdAt) {
      errors.push(issue(project, artifact.file || 'manifest.json', 'migration-identity', 'migrated id, file, and createdAt must match the contract'));
    }
  }

  try {
    for (const file of await artifactFiles(artifactsDir)) {
      if (!cataloguedFiles.has(file)) errors.push(issue(projectName, file, 'manifest-current', 'artifact file is missing from manifest'));
    }
  } catch (error) {
    errors.push(issue(projectName, '.artifacts-manager', 'artifact-directory-readable', `cannot read artifacts directory: ${error.message}`));
  }

  return { project: projectName, errors, warnings };
}

export async function validateAll(registryPath) {
  let registry;
  try {
    registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
  } catch (error) {
    return [{ project: 'registry', errors: [issue('registry', registryPath, 'registry-readable', `cannot read registry: ${error.message}`)], warnings: [] }];
  }
  if (!Array.isArray(registry.projects)) {
    return [{ project: 'registry', errors: [issue('registry', registryPath, 'registry-projects', 'projects must be an array')], warnings: [] }];
  }
  return Promise.all(registry.projects.map(({ path: projectPath }) => validateProject(projectPath)));
}

export function formatResults(results) {
  const lines = [];
  for (const result of results) {
    for (const warning of result.warnings) lines.push(`WARNING ${warning.project}:${warning.file}:${warning.line} [${warning.rule}] ${warning.message}`);
    for (const error of result.errors) lines.push(`ERROR ${error.project}:${error.file}:${error.line} [${error.rule}] ${error.message}`);
  }
  return lines;
}
