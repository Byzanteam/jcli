import { diff } from "just-diff";

import {
  Project,
  ProjectCapability,
  ProjectCapabilityPayload,
  ProjectPluginInstance,
} from "@/jet/project.ts";

import {
  builder,
  DiffPatch,
  ProjectJSON,
} from "@/jcli/config/project-json-patch-builder.ts";

export function projectDotJSONPath(projectName?: string): string {
  if (undefined === projectName) {
    return "./project.json";
  } else {
    return `${projectName}/project.json`;
  }
}

export class ProjectDotJSON {
  #name: string;
  #title: string;
  #capabilities: Array<ProjectCapability>;
  #instances: Array<ProjectPluginInstance>;

  static fromJSON(data: string) {
    return new ProjectDotJSON(JSON.parse(data));
  }

  constructor(project: Project) {
    this.#name = project.name;
    this.#title = project.title;
    this.#capabilities = project.capabilities;
    this.#instances = project.instances;
  }

  toJSON() {
    return {
      name: this.#name,
      title: this.#title,
      capabilities: this.#capabilities,
      instances: this.#instances,
    };
  }

  diff(other: ProjectDotJSON): ProjectPatch {
    const selfJSON = this.toJSON();
    const result = diff(selfJSON, other.toJSON());
    return buildPatch(result, selfJSON);
  }
}

function buildPatch(
  diffPatches: ReadonlyArray<DiffPatch>,
  dataWas: ProjectJSON,
): ProjectPatch {
  const patch: ProjectPatch = { capabilities: [], instances: [] };

  for (const diffPatch of diffPatches) {
    builder.run(diffPatch, patch, dataWas);
  }

  return patch;
}

export interface ProjectCapabilityCreatePatch {
  action: "CREATE";
  name: string;
  payload: ProjectCapabilityPayload;
}

export interface ProjectCapabilityUpdatePatch {
  action: "UPDATE";
  name: string;
  payload: ProjectCapabilityPayload;
}

export interface ProjectCapabilityDeletePatch {
  action: "DELETE";
  name: string;
}

export type ProjectCapabilityPatch =
  | ProjectCapabilityCreatePatch
  | ProjectCapabilityUpdatePatch
  | ProjectCapabilityDeletePatch;

export interface ProjectPluginInstanceCreatePatch {
  action: "CREATE";
  pluginName: string;
  name: string;
  description?: string;
  config: object;
  capabilityNames: Array<string>;
}

export interface ProjectPluginInstanceUpdatePatch {
  action: "UPDATE";
  name: string;
  description?: string;
  config?: object;
  capabilityNames?: Array<string>;
}

export interface ProjectPluginInstanceDeletePatch {
  action: "DELETE";
  name: string;
}

export type ProjectPluginInstancePatch =
  | ProjectPluginInstanceCreatePatch
  | ProjectPluginInstanceUpdatePatch
  | ProjectPluginInstanceDeletePatch;

export interface ProjectPatch {
  name?: string;
  title?: string;
  capabilities: Array<ProjectCapabilityPatch>;
  instances: Array<ProjectPluginInstancePatch>;
}
