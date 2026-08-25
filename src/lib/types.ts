// Spec: docs/specs/artifacts-manager-core.md
export type ArtifactType = 'html' | 'markdown';

export interface ArtifactMeta {
  id: string;
  title: string;
  type: ArtifactType;
  file: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  archivedAt?: string;
}

export interface ProjectManifest {
  version: string;
  projectName: string;
  description?: string;
  artifacts: ArtifactMeta[];
}

export interface RegisteredProject {
  name: string;
  path: string;
  registeredAt: string;
  lastActiveAt?: string;
}

export interface CentralRegistry {
  version: string;
  projects: RegisteredProject[];
}

export interface ProjectSummary {
  name: string;
  slug: string;
  path: string;
  exists: boolean;
  hasManifest: boolean;
  description?: string;
  artifactCount: number;
  activeArtifactCount?: number;
  archivedArtifactCount?: number;
  tags: string[];
  artifacts: ArtifactMeta[];
  registeredAt: string;
  lastActiveAt?: string;
}

export interface ArtifactDetail extends ArtifactMeta {
  projectSlug: string;
  projectName: string;
  projectPath: string;
  rawUrl: string;
  rawContent?: string;
}
