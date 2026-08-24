// Spec: docs/specs/artifacts-manager-core.md
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getArtifact } from '$lib/server/registry';
import { renderMarkdown } from '$lib/server/markdown';

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
    renderedHtml = await renderMarkdown(artifact.rawContent);
  }

  return {
    artifact,
    renderedHtml
  };
};
