export function metadataDotJSONPath(projectName: string): string {
  return `${projectName}/.jcli/metadata.json`;
}

export interface MetadataDotJSON {
  projectId: string;
}
