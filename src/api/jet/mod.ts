import {
  buildNodeId,
  connectionIterator,
  fetchLength,
  NodeType,
  query,
} from "./utilities.ts";

import { Project } from "@/jet/project.ts";
import {
  CloneProjectArgs,
  CommitArgs,
  ConfigurationHashArgs,
  CreateFunctionArgs,
  CreateFunctionFileArgs,
  CreateMigrationArgs,
  CreateProjectArgs,
  DeleteFunctionArgs,
  DeleteFunctionFileArgs,
  DeleteMigrationArgs,
  DeployArgs,
  DeployFunctionsArgs,
  InspectFunctionArgs,
  ListDeploymentLogsArgs,
  ListEnvironmentVariablesArgs,
  ListMigrationsArgs,
  MigrateDBArgs,
  PluginInstanceArgs,
  RollbackDBArgs,
  SetEnvironmentVariableArgs,
  UnsetEnvironmentVariableArgs,
  UpdateConfigurationArgs,
  UpdateFunctionFileArgs,
  UpdateMigrationArgs,
} from "@/api/jet.ts";

import { JetProject } from "@/api/jet.ts";

import { ProjectPatch } from "@/jcli/config/project-json.ts";
import { JcliConfigDotJSON } from "@/jcli/config/jcli-config-json.ts";

import {
  createProjectMutation,
  CreateProjectMutationResponse,
} from "@/api/jet/queries/create-project.ts";

import { updateConfigurationMutation } from "@/api/jet/queries/update-configuration.ts";

import { createFunctionMutation } from "@/api/jet/queries/create-function.ts";
import { deleteFunctionMutation } from "@/api/jet/queries/delete-function.ts";
import { deployDraftFunctionsMutation } from "@/api/jet/queries/deploy-draft-functions.ts";
import { createFunctionFileMutation } from "@/api/jet/queries/create-funciton-file.ts";
import { updateFunctionFileMutation } from "@/api/jet/queries/update-function-file.ts";
import { deleteFunctionFileMutation } from "@/api/jet/queries/delete-function-file.ts";

import { createMigrationMutation } from "@/api/jet/queries/create-migration.ts";
import { updateMigrationMutation } from "@/api/jet/queries/update-migration.ts";
import { deleteMigrationMutation } from "@/api/jet/queries/delete-migration.ts";

import { migrateDBMutation } from "@/api/jet/queries/migrate-db.ts";
import { rollbackDBMutation } from "@/api/jet/queries/rollback-db.ts";
import {
  listMigrationsQuery,
  ListMigrationsQueryResponse,
} from "@/api/jet/queries/list-migrations.ts";

import {
  configurationHashQuery,
  ConfigurationHashQueryResponse,
} from "./queries/configuration-hash.ts";

import { commitMutation } from "@/api/jet/queries/commit.ts";

import { deployMutation } from "@/api/jet/queries/deploy.ts";

import { setEnvironmentVariableMutation } from "@/api/jet/queries/set-environment-variable.ts";
import { unsetEnvironmentVariableMutation } from "@/api/jet/queries/unset-environment-variable.ts";
import {
  listEnvironmentVariablesQuery,
  ListEnvironmentVariablesQueryResponse,
} from "@/api/jet/queries/list-environment-variables.ts";

import {
  listDraftMigrationsQuery,
  ListDraftMigrationsQueryResponse,
  projectQuery,
  ProjectQueryResponse,
} from "@/api/jet/queries/clone.ts";
import { ProjectDotJSON } from "@/jcli/config/project-json.ts";
import { pluginInstallInstanceMutation } from "@/api/jet/queries/plugin-install-instance.ts";
import { pluginUninstallInstanceMutation } from "@/api/jet/queries/plugin-uninstall-instance.ts";

import {
  listEnvironmentsQuery,
  type ListEnvironmentsQueryResponse,
} from "@/api/jet/queries/list-environments.ts";

import {
  listDraftFunctionsQuery,
  type ListDraftFunctionsQueryResponse,
} from "@/api/jet/queries/list-draft-functions.ts";

import {
  listFunctionsQuery,
  type ListFunctionsQueryResponse,
} from "@/api/jet/queries/list-functions.ts";

import {
  listDeploymentLogsQuery,
  type ListDeploymentLogsQueryResponse,
} from "@/api/jet/queries/list-deployment-logs.ts";

import {
  inspectFunctionQuery,
  type InspectFunctionQueryResponse,
} from "@/api/jet/queries/inspect-function-query.ts";

import {
  listProjectsQuery,
  type ListProjectsQueryResponse,
} from "@/api/jet/queries/list-projects.ts";

import { ProjectEnvironmentName } from "@/api/mod.ts";
import { deployFunctionsMutation } from "@/api/jet/queries/deploy-functions.ts";

export async function createProject(
  config: JcliConfigDotJSON,
  args: CreateProjectArgs,
): Promise<Project> {
  const { projectsCreateProject: { project: { id, name, title } } } =
    await query<
      CreateProjectMutationResponse
    >(
      createProjectMutation,
      args,
      config,
    );

  return {
    id: id,
    name,
    title,
    capabilities: [],
    instances: [],
  };
}

export async function createFunction(
  config: JcliConfigDotJSON,
  args: CreateFunctionArgs,
): Promise<void> {
  await query(createFunctionMutation, args, config);
}

export async function updateConfiguration(
  config: JcliConfigDotJSON,
  rawArgs: UpdateConfigurationArgs,
): Promise<void> {
  const args = {
    projectId: rawArgs.projectId,
    command: buildCommandArgument(rawArgs.command),
  };

  await query(updateConfigurationMutation, args, config);
}

function buildCommandArgument(command: ProjectPatch) {
  const capabilities = command.capabilities.map((e) => {
    if ("create" === e.action || "update" === e.action) {
      const { action, name, payload, ...elem } = e;
      const { __type__, ...payloadRest } = payload;

      return {
        [action]: {
          capabilityName: name,
          payload: { [__type__]: payloadRest },
          ...elem,
        },
      };
    } else {
      const { action, name, ...elem } = e;

      return {
        [action]: {
          capabilityName: name,
          ...elem,
        },
      };
    }
  });

  const instances = command.instances.map((e) => {
    const { action, name, ...elem } = e;

    if ("config" in elem) {
      return {
        [action]: {
          instanceName: name,
          ...elem,
          config: JSON.stringify(elem.config),
        },
      };
    } else {
      return {
        [action]: {
          instanceName: name,
          ...elem,
        },
      };
    }
  });

  return {
    title: command.title,
    capabilities,
    instances,
  };
}

export async function deleteFunction(
  config: JcliConfigDotJSON,
  args: DeleteFunctionArgs,
): Promise<void> {
  await query(deleteFunctionMutation, args, config);
}

export async function createFunctionFile(
  config: JcliConfigDotJSON,
  args: CreateFunctionFileArgs,
): Promise<void> {
  await query(createFunctionFileMutation, args, config);
}

export async function updateFunctionFile(
  config: JcliConfigDotJSON,
  args: UpdateFunctionFileArgs,
): Promise<void> {
  await query(updateFunctionFileMutation, args, config);
}

export async function deleteFunctionFile(
  config: JcliConfigDotJSON,
  args: DeleteFunctionFileArgs,
): Promise<void> {
  await query(deleteFunctionFileMutation, args, config);
}

export async function deployFunctions(
  config: JcliConfigDotJSON,
  { environmentName, ...args }: DeployFunctionsArgs,
): Promise<void> {
  await query(
    environmentName === "DEVELOPMENT"
      ? deployDraftFunctionsMutation
      : deployFunctionsMutation,
    args,
    config,
  );
}

export async function createMigration(
  config: JcliConfigDotJSON,
  args: CreateMigrationArgs,
): Promise<void> {
  await query(createMigrationMutation, args, config);
}

export async function updateMigration(
  config: JcliConfigDotJSON,
  args: UpdateMigrationArgs,
): Promise<void> {
  await query(updateMigrationMutation, { input: args }, config);
}

export async function deleteMigration(
  config: JcliConfigDotJSON,
  args: DeleteMigrationArgs,
): Promise<void> {
  await query(deleteMigrationMutation, args, config);
}

export async function migrateDB(
  config: JcliConfigDotJSON,
  args: MigrateDBArgs,
): Promise<void> {
  await query(migrateDBMutation, args, config);
}

export async function rollbackDB(
  config: JcliConfigDotJSON,
  args: RollbackDBArgs,
): Promise<void> {
  await query(rollbackDBMutation, args, config);
}

export function listMigrations(
  config: JcliConfigDotJSON,
  args: ListMigrationsArgs,
): Promise<Array<number>> {
  function queryListMigrations(
    { first, after }: { first: number; after?: string },
  ) {
    return query<ListMigrationsQueryResponse>(listMigrationsQuery, {
      projectNodeId: buildNodeId(NodeType.project, args.projectId),
      first,
      after,
    }, config);
  }

  function callback(response: ListMigrationsQueryResponse) {
    const { node: { migrations: { pageInfo, nodes } } } = response;

    return {
      pageInfo,
      records: nodes.map((e) => e.version),
    };
  }

  return Array.fromAsync(
    connectionIterator(queryListMigrations, callback),
  );
}

export async function configurationHash(
  config: JcliConfigDotJSON,
  args: ConfigurationHashArgs,
): Promise<string> {
  const response = await query<ConfigurationHashQueryResponse>(
    configurationHashQuery,
    args,
    config,
  );

  return response.projectsConfigurationHash;
}

export async function commit(config: JcliConfigDotJSON, args: CommitArgs) {
  await query(commitMutation, args, config);
}

export async function deploy(config: JcliConfigDotJSON, args: DeployArgs) {
  await query(deployMutation, args, config);
}

export async function setEnvironmentVariable(
  config: JcliConfigDotJSON,
  args: SetEnvironmentVariableArgs,
) {
  await query(setEnvironmentVariableMutation, args, config);
}

export async function unsetEnvironmentVariable(
  config: JcliConfigDotJSON,
  args: UnsetEnvironmentVariableArgs,
) {
  await query(unsetEnvironmentVariableMutation, args, config);
}

export function listEnvironmentVariables(
  config: JcliConfigDotJSON,
  args: ListEnvironmentVariablesArgs,
): Promise<Array<{ name: string; value: string }>> {
  function queryListEnvironmentVariables(
    { first, after }: { first: number; after?: string },
  ) {
    return query<ListEnvironmentVariablesQueryResponse>(
      listEnvironmentVariablesQuery,
      {
        projectNodeId: buildNodeId(NodeType.project, args.projectId),
        first,
        after,
      },
      config,
    );
  }

  function callback(response: ListEnvironmentVariablesQueryResponse) {
    const { node: { environments: { nodes: environments } } } = response;
    const { environmentVariables: { pageInfo, nodes } } = environments.find((
      n,
    ) => n.name === args.environmentName)!;

    return {
      pageInfo,
      records: nodes,
    };
  }

  return Array.fromAsync(
    connectionIterator(queryListEnvironmentVariables, callback),
  );
}

export async function cloneProject(
  config: JcliConfigDotJSON,
  args: CloneProjectArgs,
): Promise<JetProject> {
  const projectNodeId = buildNodeId(NodeType.project, args.projectId);

  const { node: { name, draftConfiguration } } = await query<
    ProjectQueryResponse
  >(
    projectQuery,
    { projectNodeId },
    config,
  );

  return {
    name,
    configuration: ProjectDotJSON.fromJSON(draftConfiguration),
    functions: cloneProjectFunctions(projectNodeId, config),
    migrations: cloneProjectMigrations(projectNodeId, config),
  };
}

export async function pluginInstallInstance(
  config: JcliConfigDotJSON,
  args: PluginInstanceArgs,
) {
  await query(pluginInstallInstanceMutation, args, config);
}

export async function pluginUninstallInstance(
  config: JcliConfigDotJSON,
  args: PluginInstanceArgs,
) {
  await query(pluginUninstallInstanceMutation, args, config);
}

function cloneProjectMigrations(
  projectNodeId: string,
  config: JcliConfigDotJSON,
) {
  function queryListDraftMigrations(
    { first, after }: { first: number; after?: string },
  ) {
    return query<ListDraftMigrationsQueryResponse>(
      listDraftMigrationsQuery,
      {
        projectNodeId,
        first,
        after,
      },
      config,
    );
  }

  function queryListDraftMigrationsCallback(
    response: ListDraftMigrationsQueryResponse,
  ) {
    const { node: { draftMigrations: { pageInfo, nodes } } } = response;

    return {
      pageInfo,
      records: nodes.map((n) => {
        return {
          version: n.version,
          name: n.name,
          hash: n.hash,
          content: n.content,
        };
      }),
    };
  }

  return connectionIterator(
    queryListDraftMigrations,
    queryListDraftMigrationsCallback,
  );
}

function cloneProjectFunctions(
  projectNodeId: string,
  config: JcliConfigDotJSON,
) {
  function queryListDraftFunctions(
    { first, after }: { first: number; after?: string },
  ) {
    return query<ListDraftFunctionsQueryResponse>(
      listDraftFunctionsQuery,
      {
        projectNodeId,
        first,
        after,
        includeFiles: true,
      },
      config,
    );
  }

  function queryListDraftFunctionsCallback(
    response: ListDraftFunctionsQueryResponse,
  ) {
    const { node: { draftFunctions: { pageInfo, nodes } } } = response;

    return {
      pageInfo,
      records: nodes.map((n) => {
        return {
          name: n.name,
          files: n.files!.map((f) => {
            return {
              path: f.path,
              hash: f.hash,
              code: f.settings.code,
            };
          }),
        };
      }),
    };
  }

  return connectionIterator(
    queryListDraftFunctions,
    queryListDraftFunctionsCallback,
  );
}

export async function listDeploymentLogs(
  config: JcliConfigDotJSON,
  args: ListDeploymentLogsArgs,
) {
  const { projectId, functionName, environmentName, length } = args;
  const environmentNodeId = await fetchEnvironmentNodeId(
    projectId,
    environmentName,
    config,
  );

  function queryListDeploymentLogs(
    { first, after }: { first: number; after?: string },
  ) {
    return query<ListDeploymentLogsQueryResponse>(
      listDeploymentLogsQuery,
      {
        environmentNodeId,
        functionName,
        first,
        after,
      },
      config,
    );
  }

  function queryListDeploymentLogsCallback(
    response: ListDeploymentLogsQueryResponse,
  ) {
    const { node: { deploymentLogs: { pageInfo, nodes } } } = response;

    return {
      pageInfo,
      records: nodes.map((n) => {
        return {
          functionName: n.functionName,
          message: n.message,
          severity: n.metadata.severity,
          timestamp: n.timestamp,
          stacktrace: n.metadata.stacktrace,
        };
      }),
    };
  }

  return Array.fromAsync(fetchLength(
    queryListDeploymentLogs,
    queryListDeploymentLogsCallback,
    length,
  ));
}

export async function inspectFunction(
  config: JcliConfigDotJSON,
  args: InspectFunctionArgs,
) {
  const { environmentName, projectId, functionName } = args;

  let functionNodeId: string | undefined = undefined;

  switch (environmentName) {
    case "DEVELOPMENT":
      functionNodeId = await fetchDraftFunctionNodeId(
        projectId,
        functionName,
        config,
      );
      break;

    case "PRODUCTION":
      functionNodeId = await fetchFunctionNodeId(
        projectId,
        functionName,
        config,
      );
      break;
  }

  if (!functionNodeId) return;

  const { node: { deployment } } = await query<
    InspectFunctionQueryResponse
  >(
    inspectFunctionQuery,
    {
      functionNodeId,
    },
    config,
  );

  return deployment;
}

export function listProjects(
  config: JcliConfigDotJSON,
): Promise<
  Array<{
    id: string;
    name: string;
  }>
> {
  function queryListProjects(
    { first, after }: { first: number; after?: string },
  ) {
    return query<ListProjectsQueryResponse>(
      listProjectsQuery,
      {
        first,
        after,
      },
      config,
    );
  }
  function callback(response: ListProjectsQueryResponse) {
    const { projects: { nodes, pageInfo } } = response;
    return {
      pageInfo,
      records: nodes,
    };
  }

  return Array.fromAsync(
    connectionIterator(queryListProjects, callback),
  );
}

async function fetchEnvironmentNodeId(
  projectId: string,
  environmentName: ProjectEnvironmentName,
  config: JcliConfigDotJSON,
) {
  function queryListEnvironments(
    { first, after }: { first: number; after?: string },
  ) {
    return query<ListEnvironmentsQueryResponse>(
      listEnvironmentsQuery,
      {
        projectNodeId: buildNodeId(NodeType.project, projectId),
        first,
        after,
      },
      config,
    );
  }

  function queryListEnvironmentsCallback(
    response: ListEnvironmentsQueryResponse,
  ) {
    const { node: { environments: { pageInfo, nodes } } } = response;

    return {
      pageInfo,
      records: nodes,
    };
  }

  const environments = await Array.fromAsync(connectionIterator(
    queryListEnvironments,
    queryListEnvironmentsCallback,
  ));

  const { nodeId: environmentNodeId } = environments.find((e) =>
    e.name === environmentName
  )!;

  return environmentNodeId;
}

async function fetchDraftFunctionNodeId(
  projectId: string,
  functionName: string,
  config: JcliConfigDotJSON,
) {
  function queryListDraftFunctions(
    { first, after }: { first: number; after?: string },
  ) {
    return query<ListDraftFunctionsQueryResponse>(
      listDraftFunctionsQuery,
      {
        projectNodeId: buildNodeId(NodeType.project, projectId),
        first,
        after,
        includeFiles: false,
      },
      config,
    );
  }

  function queryListDraftFunctionsCallback(
    response: ListDraftFunctionsQueryResponse,
  ) {
    const { node: { draftFunctions: { pageInfo, nodes } } } = response;

    return {
      pageInfo,
      records: nodes.map((n) => {
        return {
          name: n.name,
          nodeId: n.nodeId,
        };
      }),
    };
  }

  const draftFunctions = await Array.fromAsync(connectionIterator(
    queryListDraftFunctions,
    queryListDraftFunctionsCallback,
  ));

  const draftFunction = draftFunctions.find((f) => f.name === functionName);

  return draftFunction?.nodeId;
}

async function fetchFunctionNodeId(
  projectId: string,
  functionName: string,
  config: JcliConfigDotJSON,
) {
  function queryListFunctions(
    { first, after }: { first: number; after?: string },
  ) {
    return query<ListFunctionsQueryResponse>(
      listFunctionsQuery,
      {
        projectNodeId: buildNodeId(NodeType.project, projectId),
        first,
        after,
      },
      config,
    );
  }

  function queryListFunctionsCallback(
    response: ListFunctionsQueryResponse,
  ) {
    const { node: { functions: { pageInfo, nodes } } } = response;

    return {
      pageInfo,
      records: nodes.map((n) => {
        return {
          name: n.name,
          nodeId: n.nodeId,
        };
      }),
    };
  }

  const functions = await Array.fromAsync(connectionIterator(
    queryListFunctions,
    queryListFunctionsCallback,
  ));

  const fun = functions.find((f) => f.name === functionName);

  return fun?.nodeId;
}
