export interface ProjectDatabaseCapabilityPayload {
  __type__: "database";
  schema: string;
}

export type ProjectCapabilityPayload = ProjectDatabaseCapabilityPayload;

export interface ProjectCapability {
  name: string;
  payload: ProjectCapabilityPayload;
}

export interface ProjectPluginInstance {
  pluginName: string;
  name: string;
  description?: string;
  config: object;
  capabilityNames: Array<string>;
}

export interface ProjectImports {
  [key: string]: string;
}

export interface ProjectScopes {
  [scopeName: string]: Record<string, string>;
}

type WorkflowName = string;
type WorkflowVersion = number;

export type ProjectRunningWorkflows = Record<
  WorkflowName,
  Array<WorkflowVersion>
>;

export interface Project {
  id: string;
  name: string;
  title: string;
  capabilities: Array<ProjectCapability>;
  instances: Array<ProjectPluginInstance>;
  entryFile?: string;
  imports?: ProjectImports;
  scopes?: ProjectScopes;
  runningWorkflows: ProjectRunningWorkflows;
}
