// Spec: docs/specs/artifacts-manager-core.md
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getArtifact } from '$lib/server/registry';
import { marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-sql.js';

// Configure marked with syntax highlighting
marked.setOptions({
  gfm: true,
  breaks: true
});

export const load: PageServerLoad = async ({ params }) => {
  const { projectSlug, artifactId } = params;
  if (!projectSlug || !artifactId) {
    throw error(400, 'Project slug and artifact ID are required');
  }

  const artifact = await getArtifact(projectSlug, artifactId);
  if (!artifact) {
    throw error(404, `Artifact not found: ${artifactId} in project ${projectSlug}`);
  }

  let renderedHtml = '';
  if (artifact.type === 'markdown' && artifact.rawContent) {
    try {
      renderedHtml = await marked.parse(artifact.rawContent);
    } catch (err: any) {
      renderedHtml = `<p class="error">Failed to parse markdown: ${err.message}</p>`;
    }
  }

  return {
    artifact,
    renderedHtml
  };
};
