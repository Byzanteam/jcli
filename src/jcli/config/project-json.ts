import { diff } from "just-diff";

import {
  Project,
  ProjectCapability,
  ProjectCapabilityPayload,
  ProjectImports,
  ProjectPluginInstance,
  ProjectScopes,
} from "@/jet/project.ts";

import {
  builder,
  DiffPatch,
  ProjectJSON,
} from "@/jcli/config/project-json-patch-builder.ts";

import projectJSONSchema from "@schemas/project-file.v1.json" with {
  type: "json",
};

export type ProjectJsonWithObject =
  & Omit<Project, "id" | "instances" | "capabilities">
  & {
    capabilities: {
      [key: string]: ProjectCapability;
    };
    instances: {
      [key: string]: ProjectPluginInstance;
    };
  };

export function projectDotJSONPath(projectName?: string): string {
  if (undefined === projectName) {
    return "./project.json";
  } else {
    return `${projectName}/project.json`;
  }
}

export class ProjectDotJSON {
  readonly name: string;
  readonly title: string;
  #capabilities: Array<ProjectCapability>;
  #instances: Array<ProjectPluginInstance>;
  #imports: ProjectImports | undefined;
  #scopes: ProjectScopes | undefined;

  static fromJSON(data: string) {
    return new ProjectDotJSON(JSON.parse(data));
  }

  constructor(project: Project) {
    this.name = project.name;
    this.title = project.title;
    this.#capabilities = project.capabilities;
    this.#instances = project.instances;
    this.#imports = project.imports;
    this.#scopes = project.scopes;
  }

  toJSON() {
    return {
      "$schema": projectJSONSchema.$id,
      name: this.name,
      title: this.title,
      capabilities: this.#capabilities,
      instances: this.#instances,
      imports: this.#imports,
      scopes: this.#scopes,
    };
  }

  diff(other: ProjectDotJSON): ProjectPatch {
    const result = diff(
      buildProjectJsonWithObjects(this.toJSON()),
      buildProjectJsonWithObjects(other.toJSON()),
    );

    return buildPatch(result, this.toJSON());
  }
}

export function buildProjectJsonWithObjects(
  project: ProjectJSON,
): ProjectJsonWithObject {
  const convertArrayToObject = <T extends { name: string }>(array: T[]) =>
    array.reduce((acc, item) => {
      acc[item.name] = item;
      return acc;
    }, {} as { [key: string]: T });

  return {
    ...project,
    capabilities: convertArrayToObject(project.capabilities),
    instances: convertArrayToObject(project.instances),
  };
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

export function isPatchEmpty(patch: ProjectPatch): boolean {
  return !("title" in patch) && !("name" in patch) &&
    patch.capabilities.length === 0 && patch.instances.length === 0 &&
    !("imports" in patch) && !("scopes" in patch);
}

export interface ProjectCapabilityCreatePatch {
  action: "create";
  name: string;
  payload: ProjectCapabilityPayload;
}

export interface ProjectCapabilityUpdatePatch {
  action: "update";
  name: string;
  payload: ProjectCapabilityPayload;
}

export interface ProjectCapabilityDeletePatch {
  action: "delete";
  name: string;
}

export type ProjectCapabilityPatch =
  | ProjectCapabilityCreatePatch
  | ProjectCapabilityUpdatePatch
  | ProjectCapabilityDeletePatch;

export interface ProjectPluginInstanceCreatePatch {
  action: "create";
  pluginName: string;
  name: string;
  description?: string;
  config: object;
  capabilityNames: Array<string>;
}

export interface ProjectPluginInstanceUpdatePatch {
  action: "update";
  name: string;
  description?: string;
  config?: object;
  capabilityNames?: Array<string>;
}

export interface ProjectPluginInstanceDeletePatch {
  action: "delete";
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
  imports?: ProjectImports;
  scopes?: ProjectScopes;
}
