// Spec: docs/specs/artifacts-manager-core.md
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProjectBySlug } from '$lib/server/registry';

export const load: PageServerLoad = async ({ params }) => {
  const { projectSlug } = params;
  if (!projectSlug) {
    throw error(400, 'Project slug is required');
  }

  const project = await getProjectBySlug(projectSlug);
  if (!project) {
    throw error(404, `Project not found: ${projectSlug}`);
  }

  // Count tag occurrences
  const tagCounts: Record<string, number> = {};
  project.artifacts.forEach(art => {
    if (Array.isArray(art.tags)) {
      art.tags.forEach(t => {
        const lower = t.toLowerCase();
        tagCounts[lower] = (tagCounts[lower] || 0) + 1;
      });
    }
  });

  return {
    project,
    tagCounts
  };
};
