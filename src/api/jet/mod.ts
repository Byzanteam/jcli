import {
  buildNodeId,
  connectionIterator,
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
  DeployDraftFunctionsArgs,
  ListEnvironmentVariablesArgs,
  ListMigrationsArgs,
  MigrateDBArgs,
  PluginEnableInstanceArgs,
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
  listDraftFunctionsQuery,
  ListDraftFunctionsQueryResponse,
  listDraftMigrationsQuery,
  ListDraftMigrationsQueryResponse,
  projectQuery,
  ProjectQueryResponse,
} from "@/api/jet/queries/clone.ts";
import { ProjectDotJSON } from "@/jcli/config/project-json.ts";
import { pluginEnableInstanceMutation } from "@/api/jet/queries/plugin-enable-instance.ts";

export async function createProject(
  args: CreateProjectArgs,
  config: JcliConfigDotJSON,
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
  args: CreateFunctionArgs,
  config: JcliConfigDotJSON,
): Promise<void> {
  await query(createFunctionMutation, args, config);
}

export async function updateConfiguration(
  rawArgs: UpdateConfigurationArgs,
  config: JcliConfigDotJSON,
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
  args: DeleteFunctionArgs,
  config: JcliConfigDotJSON,
): Promise<void> {
  await query(deleteFunctionMutation, args, config);
}

export async function createFunctionFile(
  args: CreateFunctionFileArgs,
  config: JcliConfigDotJSON,
): Promise<void> {
  await query(createFunctionFileMutation, args, config);
}

export async function updateFunctionFile(
  args: UpdateFunctionFileArgs,
  config: JcliConfigDotJSON,
): Promise<void> {
  await query(updateFunctionFileMutation, args, config);
}

export async function deleteFunctionFile(
  args: DeleteFunctionFileArgs,
  config: JcliConfigDotJSON,
): Promise<void> {
  await query(deleteFunctionFileMutation, args, config);
}

export async function deployDraftFunctions(
  args: DeployDraftFunctionsArgs,
  config: JcliConfigDotJSON,
): Promise<void> {
  await query(deployDraftFunctionsMutation, args, config);
}

export async function createMigration(
  args: CreateMigrationArgs,
  config: JcliConfigDotJSON,
): Promise<void> {
  await query(createMigrationMutation, args, config);
}

export async function updateMigration(
  args: UpdateMigrationArgs,
  config: JcliConfigDotJSON,
): Promise<void> {
  await query(updateMigrationMutation, { input: args }, config);
}

export async function deleteMigration(
  args: DeleteMigrationArgs,
  config: JcliConfigDotJSON,
): Promise<void> {
  await query(deleteMigrationMutation, args, config);
}

export async function migrateDB(
  args: MigrateDBArgs,
  config: JcliConfigDotJSON,
): Promise<void> {
  await query(migrateDBMutation, args, config);
}

export async function rollbackDB(
  args: RollbackDBArgs,
  config: JcliConfigDotJSON,
): Promise<void> {
  await query(rollbackDBMutation, args, config);
}

export function listMigrations(
  args: ListMigrationsArgs,
  config: JcliConfigDotJSON,
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
  args: ConfigurationHashArgs,
  config: JcliConfigDotJSON,
): Promise<string> {
  const response = await query<ConfigurationHashQueryResponse>(
    configurationHashQuery,
    args,
    config,
  );

  return response.projectsConfigurationHash;
}

export async function commit(args: CommitArgs, config: JcliConfigDotJSON) {
  await query(commitMutation, args, config);
}

export async function deploy(args: DeployArgs, config: JcliConfigDotJSON) {
  await query(deployMutation, args, config);
}

export async function setEnvironmentVariable(
  args: SetEnvironmentVariableArgs,
  config: JcliConfigDotJSON,
) {
  await query(setEnvironmentVariableMutation, args, config);
}

export async function unsetEnvironmentVariable(
  args: UnsetEnvironmentVariableArgs,
  config: JcliConfigDotJSON,
) {
  await query(unsetEnvironmentVariableMutation, args, config);
}

export function listEnvironmentVariables(
  args: ListEnvironmentVariablesArgs,
  config: JcliConfigDotJSON,
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
  args: CloneProjectArgs,
  config: JcliConfigDotJSON,
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

export async function pluginEnableInstance(
  args: PluginEnableInstanceArgs,
  config: JcliConfigDotJSON,
) {
  await query(pluginEnableInstanceMutation, args, config);
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
          files: n.files.map((f) => {
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
