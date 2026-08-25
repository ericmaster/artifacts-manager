// Spec: docs/specs/artifacts-manager-core.md
import { json, type RequestHandler } from '@sveltejs/kit';
import { archiveArtifact, deleteArtifact, getArtifact } from '$lib/server/registry';

export const GET: RequestHandler = async ({ params }) => {
  const { projectSlug, artifactId } = params;
  if (!projectSlug || !artifactId) {
    return json({ success: false, error: 'Missing projectSlug or artifactId parameter' }, { status: 400 });
  }

  try {
    const artifact = await getArtifact(projectSlug, artifactId);
    if (!artifact) {
      return json({ success: false, error: `Artifact not found: ${artifactId} in project ${projectSlug}` }, { status: 404 });
    }
    return json({ success: true, artifact });
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const { projectSlug, artifactId } = params;
  if (!projectSlug || !artifactId) {
    return json({ success: false, error: 'Missing projectSlug or artifactId parameter' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const archived = typeof body.archived === 'boolean' ? body.archived : true;

    const updated = await archiveArtifact(projectSlug, artifactId, archived);
    return json({
      success: true,
      artifact: updated
    });
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 500;
    return json({ success: false, error: err.message }, { status });
  }
};

export const DELETE: RequestHandler = async ({ params, url, request }) => {
  const { projectSlug, artifactId } = params;
  if (!projectSlug || !artifactId) {
    return json({ success: false, error: 'Missing projectSlug or artifactId parameter' }, { status: 400 });
  }

  try {
    let deleteFile = true;
    if (url.searchParams.has('deleteFile')) {
      deleteFile = url.searchParams.get('deleteFile') !== 'false';
    } else {
      const body = await request.json().catch(() => ({}));
      if (typeof body.deleteFile === 'boolean') {
        deleteFile = body.deleteFile;
      }
    }

    const result = await deleteArtifact(projectSlug, artifactId, deleteFile);
    return json(result);
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 500;
    return json({ success: false, error: err.message }, { status });
  }
};

export const POST: RequestHandler = async ({ params, request }) => {
  const { projectSlug, artifactId } = params;
  if (!projectSlug || !artifactId) {
    return json({ success: false, error: 'Missing projectSlug or artifactId parameter' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || (body.archived !== undefined ? 'archive' : 'delete');

    if (action === 'archive' || action === 'unarchive') {
      const archived = action === 'archive' ? true : false;
      const updated = await archiveArtifact(projectSlug, artifactId, archived);
      return json({ success: true, artifact: updated });
    } else if (action === 'delete') {
      const deleteFile = typeof body.deleteFile === 'boolean' ? body.deleteFile : true;
      const result = await deleteArtifact(projectSlug, artifactId, deleteFile);
      return json(result);
    } else {
      return json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 500;
    return json({ success: false, error: err.message }, { status });
  }
};
