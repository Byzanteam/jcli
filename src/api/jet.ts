import { getConfig } from "@/api/mod.ts";

import {
  commit as doCommit,
  createFunction as doCreateFunction,
  createFunctionFile as doCreateFunctionFile,
  createMigration as doCreateMigration,
  createProject as doCreateProject,
  deleteFunction as doDeleteFunction,
  deleteFunctionFile as doDeleteFunctionFile,
  deleteMigration as doDeleteMigration,
  deploy as doDeploy,
  listMigrations as doListMigrations,
  migrateDB as doMigrateDB,
  rollbackDB as doRollbackDB,
  updateConfiguration as doUpdateConfiguration,
  updateFunctionFile as doUpdateFunctionFile,
  updateMigration as doUpdateMigration,
} from "@/api/jet/mod.ts";

import { ProjectPatch } from "@/jcli/config/project-json.ts";
import { JcliConfigDotJSON } from "@/jcli/config/jcli-config-json.ts";
import { getLogger } from "@/jcli/logger.ts";
import { Project } from "@/jet/project.ts";

export interface CreateProjectArgs {
  name: string;
  title: string;
}

export interface UpdateConfigurationArgs {
  projectUuid: string;
  commands: ProjectPatch;
}

export interface CreateFunctionArgs {
  projectUuid: string;
  name: string;
  title: string;
}

export interface CreateFunctionFileArgs {
  projectUuid: string;
  functionName: string;
  path: string;
  code: string;
}

export interface UpdateFunctionFileArgs {
  projectUuid: string;
  functionName: string;
  path: string;
  code: string;
}

export interface DeleteFunctionFileArgs {
  projectUuid: string;
  functionName: string;
  path: string;
}

export interface DeleteFunctionArgs {
  projectUuid: string;
  functionName: string;
}

export interface CreateMigrationArgs {
  projectUuid: string;
  version: number;
  content: string;
}

export interface UpdateMigrationArgs {
  projectUuid: string;
  migrationVersion: number;
  content: string;
}

export interface DeleteMigrationArgs {
  projectUuid: string;
  migrationVersion: number;
}

export interface MigrateDBArgs {
  projectUuid: string;
}

export interface RollbackDBArgs {
  projectUuid: string;
}

export interface ListMigrationsArgs {
  projectUuid: string;
}

export interface CommitArgs {
  projectUuid: string;
  message?: string;
  expectedProjectHash: string;
}

export interface DeployArgs {
  projectUuid: string;
  commitId?: string;
}

export interface Jet {
  createProject(args: CreateProjectArgs): Promise<Project>;
  updateConfiguration(args: UpdateConfigurationArgs): Promise<void>;
  createFunction(args: CreateFunctionArgs): Promise<void>;
  deleteFunction(args: DeleteFunctionArgs): Promise<void>;
  createFunctionFile(args: CreateFunctionFileArgs): Promise<void>;
  updateFunctionFile(args: UpdateFunctionFileArgs): Promise<void>;
  deleteFunctionFile(args: DeleteFunctionFileArgs): Promise<void>;
  createMigration(args: CreateMigrationArgs): Promise<void>;
  updateMigration(args: UpdateMigrationArgs): Promise<void>;
  deleteMigration(args: DeleteMigrationArgs): Promise<void>;
  migrateDB(args: MigrateDBArgs): Promise<void>;
  rollbackDB(args: RollbackDBArgs): Promise<void>;
  listMigrations(args: ListMigrationsArgs): Promise<Array<number>>;
  commit(args: CommitArgs): Promise<void>;
  deploy(args: DeployArgs): Promise<void>;
}

function logDebugMetricsWrapper<T, U>(
  fn: (args: T, config: JcliConfigDotJSON) => Promise<U>,
  description: string,
): (args: T) => Promise<U> {
  return async function (args: T) {
    const logger = getLogger();

    logger.debug(
      `Starting to request jet to ${description} with arguments: \`${
        Deno.inspect(args)
      }\``,
    );

    const startInstant = performance.now();
    const payload = await fn(args, await getConfig().get());
    const endInstant = performance.now();

    logger.debug(`Request finished in ${endInstant - startInstant}ms.`);

    return payload;
  };
}

export const jet: Jet = {
  createProject: logDebugMetricsWrapper(doCreateProject, "create project"),
  updateConfiguration: logDebugMetricsWrapper(
    doUpdateConfiguration,
    "update configuration",
  ),
  createFunction: logDebugMetricsWrapper(
    doCreateFunction,
    "create function",
  ),
  createFunctionFile: logDebugMetricsWrapper(
    doCreateFunctionFile,
    "create function file",
  ),
  updateFunctionFile: logDebugMetricsWrapper(
    doUpdateFunctionFile,
    "update function file",
  ),
  deleteFunctionFile: logDebugMetricsWrapper(
    doDeleteFunctionFile,
    "delete function file",
  ),
  createMigration: logDebugMetricsWrapper(
    doCreateMigration,
    "create migration",
  ),
  updateMigration: logDebugMetricsWrapper(
    doUpdateMigration,
    "update migration",
  ),
  migrateDB: logDebugMetricsWrapper(doMigrateDB, "migrate DB"),
  rollbackDB: logDebugMetricsWrapper(doRollbackDB, "rollback DB"),
  listMigrations: logDebugMetricsWrapper(
    doListMigrations,
    "list DB migrations",
  ),
  deleteFunction: logDebugMetricsWrapper(
    doDeleteFunction,
    "delete function",
  ),
  deleteMigration: logDebugMetricsWrapper(
    doDeleteMigration,
    "delete migration",
  ),
  commit: logDebugMetricsWrapper(doCommit, "commit"),
  deploy: logDebugMetricsWrapper(doDeploy, "deploy"),
};
