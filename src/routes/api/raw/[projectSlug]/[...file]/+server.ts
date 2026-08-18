// Spec: docs/specs/artifacts-manager-core.md
import { error, type RequestHandler } from '@sveltejs/kit';
import { getSafeRawAssetPath } from '$lib/server/registry';
import fs from 'node:fs/promises';
import path from 'node:path';

const MIME_MAP: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

export const GET: RequestHandler = async ({ params }) => {
  const { projectSlug, file } = params;
  if (!projectSlug || !file) {
    throw error(400, 'Missing project or file parameter');
  }

  const resolvedPath = await getSafeRawAssetPath(projectSlug, file);
  if (!resolvedPath) {
    throw error(404, `Artifact file not found: ${file}`);
  }

  try {
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const content = await fs.readFile(resolvedPath);

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, must-revalidate',
        'X-Frame-Options': 'SAMEORIGIN'
      }
    });
  } catch (err: any) {
    throw error(500, `Failed to read asset: ${err.message}`);
  }
};
