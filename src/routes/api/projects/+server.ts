// Spec: docs/specs/artifacts-manager-core.md
import { json, type RequestHandler } from '@sveltejs/kit';
import { getAllProjects } from '$lib/server/registry';

export const GET: RequestHandler = async () => {
  try {
    const projects = await getAllProjects();
    return json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
