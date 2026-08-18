// Spec: docs/specs/artifacts-manager-core.md
import type { PageServerLoad } from './$types';
import { getAllProjects } from '$lib/server/registry';

export const load: PageServerLoad = async () => {
  const projects = await getAllProjects();
  
  const totalArtifacts = projects.reduce((sum, p) => sum + p.artifactCount, 0);
  const allTagsSet = new Set<string>();
  projects.forEach(p => p.tags.forEach(t => allTagsSet.add(t)));

  return {
    projects,
    stats: {
      totalProjects: projects.length,
      totalArtifacts,
      totalTags: allTagsSet.size
    },
    allTags: Array.from(allTagsSet).sort()
  };
};
