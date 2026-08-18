// Spec: docs/specs/artifacts-manager-core.md
import { json, type RequestHandler } from '@sveltejs/kit';
import { registerProject } from '$lib/server/registry';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { path: projectPath, name } = body;

    if (!projectPath || typeof projectPath !== 'string') {
      return json({ success: false, error: 'Missing or invalid project path' }, { status: 400 });
    }

    const project = await registerProject(projectPath, name);
    return json({
      success: true,
      message: `Project '${project.name}' successfully registered`,
      project
    });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
