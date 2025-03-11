import { diff } from "just-diff";

import {
  Project,
  ProjectCapability,
  ProjectCapabilityPayload,
  ProjectImports,
  ProjectPluginInstance,
  ProjectRunningWorkflows,
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

export type ProjectJsonForDiff =
  & Omit<ProjectJSON, "instances" | "capabilities">
  & {
    capabilities: {
      [key: string]: ProjectJSON["capabilities"][number];
    };
    instances: {
      [key: string]: ProjectJSON["instances"][number];
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
  #entryFile: string | undefined;
  #imports: ProjectImports | undefined;
  #scopes: ProjectScopes | undefined;
  #runningWorkflows: ProjectRunningWorkflows;

  static fromJSON(data: string) {
    return new ProjectDotJSON(JSON.parse(data));
  }

  constructor(project: Project) {
    this.name = project.name;
    this.title = project.title;
    this.#capabilities = project.capabilities;
    this.#instances = project.instances;
    this.#entryFile = project.entryFile;
    this.#imports = project.imports;
    this.#scopes = project.scopes;
    this.#runningWorkflows = project.runningWorkflows;
  }

  toJSON() {
    return {
      "$schema": projectJSONSchema.$id,
      name: this.name,
      title: this.title,
      capabilities: this.#capabilities,
      instances: this.#instances,
      entryFile: this.#entryFile,
      imports: this.#imports,
      scopes: this.#scopes,
      runningWorkflows: this.#runningWorkflows,
    };
  }

  diff(other: ProjectDotJSON): ProjectPatch {
    const dataWas = buildProjectJsonForDiff(this.toJSON());
    const data = buildProjectJsonForDiff(other.toJSON());

    const result = diff(dataWas, data);

    return buildPatch(result, dataWas);
  }
}

export function buildProjectJsonForDiff(
  project: ProjectJSON,
): ProjectJsonForDiff {
  function convertArrayToObject<T extends { name: string }>(
    name: string,
    array: T[],
  ): { [key: string]: T } {
    return array.reduce<{ [key: string]: T }>((acc, item) => {
      if (Object.prototype.isPrototypeOf.call(acc, item.name)) {
        throw new Error(`Duplicate ${name}: ${item.name}`);
      }

      acc[item.name] = item;
      return acc;
    }, {});
  }

  return {
    ...project,
    capabilities: convertArrayToObject("capability", [...project.capabilities]),
    instances: convertArrayToObject("instance", [...project.instances]),
  };
}

function buildPatch(
  diffPatches: ReadonlyArray<DiffPatch>,
  dataWas: ProjectJsonForDiff,
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
    !("imports" in patch) && !("scopes" in patch) &&
    !("runningWorkflows" in patch) && !("entryFile" in patch);
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
  title?: string;
  capabilities: Array<ProjectCapabilityPatch>;
  instances: Array<ProjectPluginInstancePatch>;
  entryFile?: string | null;
  imports?: ProjectImports | null;
  scopes?: ProjectScopes | null;
  runningWorkflows?: ProjectRunningWorkflows;
}
