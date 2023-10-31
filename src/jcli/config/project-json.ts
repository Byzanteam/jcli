import {
  Project,
  ProjectCapability,
  ProjectPluginInstance,
} from "@/jet/project.ts";

export function projectDotJSONPath(projectName: string): string {
  return `${projectName}/project.json`;
}

export class ProjectDotJSON {
  #name: string;
  #title: string;
  #capabilities: Array<ProjectCapability>;
  #instances: Array<ProjectPluginInstance>;

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
}
