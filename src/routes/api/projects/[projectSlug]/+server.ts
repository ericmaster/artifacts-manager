// Spec: docs/specs/artifacts-manager-core.md
import { json, type RequestHandler } from '@sveltejs/kit';
import { getProjectBySlug } from '$lib/server/registry';

export const GET: RequestHandler = async ({ params }) => {
  const { projectSlug } = params;
  if (!projectSlug) {
    return json({ success: false, error: 'Missing projectSlug parameter' }, { status: 400 });
  }

  try {
    const project = await getProjectBySlug(projectSlug);
    if (!project) {
      return json({ success: false, error: `Project not found: ${projectSlug}` }, { status: 404 });
    }

    return json({
      success: true,
      project
    });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
