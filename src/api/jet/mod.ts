import {
  buildNodeId,
  connectionIterator,
  NodeType,
  query,
} from "./utilities.ts";

import { Project } from "@/jet/project.ts";
import {
  CommitArgs,
  CreateFunctionArgs,
  CreateFunctionFileArgs,
  CreateMigrationArgs,
  CreateProjectArgs,
  DeleteFunctionArgs,
  DeleteFunctionFileArgs,
  DeleteMigrationArgs,
  DeployArgs,
  DeployDraftFunctionsArgs,
  ListMigrationsArgs,
  MigrateDBArgs,
  RollbackDBArgs,
  UpdateConfigurationArgs,
  UpdateFunctionFileArgs,
  UpdateMigrationArgs,
} from "@/api/jet.ts";

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

import { commitMutation } from "@/api/jet/queries/commit.ts";

import { deployMutation } from "@/api/jet/queries/deploy.ts";

export async function createProject(
  args: CreateProjectArgs,
  config: JcliConfigDotJSON,
): Promise<Project> {
  const { createProject: { project: { uuid, name, title } } } = await query<
    CreateProjectMutationResponse
  >(
    createProjectMutation,
    args,
    config,
  );

  return {
    id: uuid,
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
    projectId: rawArgs.projectUuid,
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

    return {
      [action]: {
        instanceName: name,
        ...elem,
      },
    };
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

export async function listMigrations(
  args: ListMigrationsArgs,
  config: JcliConfigDotJSON,
): Promise<Array<number>> {
  function queryListMigrations(
    { first, after }: { first: number; after?: string },
  ) {
    return query<ListMigrationsQueryResponse>(listMigrationsQuery, {
      projectId: buildNodeId(NodeType.project, args.projectUuid),
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

  const versions: Array<number> = [];

  for await (
    const version of connectionIterator(queryListMigrations, callback, {
      perPage: 1,
    })
  ) {
    versions.push(version);
  }

  return versions;
}

export async function commit(args: CommitArgs, config: JcliConfigDotJSON) {
  await query(commitMutation, args, config);
}

export async function deploy(args: DeployArgs, config: JcliConfigDotJSON) {
  await query(deployMutation, args, config);
}
