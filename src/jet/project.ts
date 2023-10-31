export type ProjectDatabaseCapabilityPayload = {
  __type__: "database";
  schema: string;
};

export type ProjectCapabilityPayload = ProjectDatabaseCapabilityPayload;

export interface ProjectCapability {
  name: string;
  payload: ProjectCapabilityPayload;
}

export interface ProjectPluginInstance {
  pluginName: string;
  name: string;
  description: string;
  config: object;
  capabilityNames: Array<string>;
}

export interface Project {
  id: string;
  name: string;
  title: string;
  capabilities: Array<ProjectCapability>;
  instances: Array<ProjectPluginInstance>;
}
