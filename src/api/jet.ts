import { getConfig } from "@/api/mod.ts";

import {
  cloneProject as doCloneProject,
  commit as doCommit,
  configurationHash as doConfigurationHash,
  createFunction as doCreateFunction,
  createFunctionFile as doCreateFunctionFile,
  createMigration as doCreateMigration,
  createProject as doCreateProject,
  deleteFunction as doDeleteFunction,
  deleteFunctionFile as doDeleteFunctionFile,
  deleteMigration as doDeleteMigration,
  deploy as doDeploy,
  deployDraftFunctions as doDeployDraftFunctions,
  listDeploymentLogs as doListDeploymentLogs,
  listEnvironmentVariables as doListEnvironmentVariables,
  listMigrations as doListMigrations,
  migrateDB as doMigrateDB,
  pluginInstallInstance as doPluginInstallInstance,
  pluginUninstallInstance as doPluginUninstallInstance,
  rollbackDB as doRollbackDB,
  setEnvironmentVariable as doSetEnvironmentVariable,
  unsetEnvironmentVariable as doUnsetEnvironmentVariable,
  updateConfiguration as doUpdateConfiguration,
  updateFunctionFile as doUpdateFunctionFile,
  updateMigration as doUpdateMigration,
} from "@/api/jet/mod.ts";

import { ProjectDotJSON, ProjectPatch } from "@/jcli/config/project-json.ts";
import { JcliConfigDotJSON } from "@/jcli/config/jcli-config-json.ts";
import { getLogger } from "@/jcli/logger.ts";
import { Project } from "@/jet/project.ts";

export interface CreateProjectArgs {
  name: string;
  title: string;
}

export interface UpdateConfigurationArgs {
  projectId: string;
  command: ProjectPatch;
}

export interface CreateFunctionArgs {
  projectId: string;
  name: string;
  title: string;
}

export interface CreateFunctionFileArgs {
  projectId: string;
  functionName: string;
  path: string;
  code: string;
}

export interface UpdateFunctionFileArgs {
  projectId: string;
  functionName: string;
  path: string;
  code: string;
}

export interface DeleteFunctionFileArgs {
  projectId: string;
  functionName: string;
  path: string;
}

export interface DeployDraftFunctionsArgs {
  projectId: string;
}

export interface DeleteFunctionArgs {
  projectId: string;
  functionName: string;
}

export interface CreateMigrationArgs {
  projectId: string;
  version: number;
  name: string | null;
  content: string;
}

export interface UpdateMigrationArgs {
  projectId: string;
  migrationVersion: number;
  name?: string | null;
  content?: string;
}

export interface DeleteMigrationArgs {
  projectId: string;
  migrationVersion: number;
}

export interface MigrateDBArgs {
  projectId: string;
}

export interface RollbackDBArgs {
  projectId: string;
}

export interface ListMigrationsArgs {
  projectId: string;
}

export interface ConfigurationHashArgs {
  configuration: string;
}

export interface CommitArgs {
  projectId: string;
  message?: string;
  hash: string;
}

export interface DeployArgs {
  projectId: string;
  commitId?: string;
}

export type ProjectEnvironmentName = "DEVELOPMENT" | "PRODUCTION";

export interface SetEnvironmentVariableArgs {
  projectId: string;
  environmentName: ProjectEnvironmentName;
  name: string;
  value: string;
}

export interface UnsetEnvironmentVariableArgs {
  projectId: string;
  environmentName: ProjectEnvironmentName;
  name: string;
}

export interface ListEnvironmentVariablesArgs {
  projectId: string;
  environmentName: ProjectEnvironmentName;
}

export interface CloneProjectArgs {
  projectId: string;
}

export interface PluginInstanceArgs {
  projectId: string;
  instanceName: string;
  environmentName: ProjectEnvironmentName;
}

export interface ListDeploymentLogsArgs {
  projectId: string;
  environmentName: ProjectEnvironmentName;
  functionName?: string;
  length: number;
}

export interface JetProject {
  name: string;
  configuration: ProjectDotJSON;
  functions: AsyncIterable<{
    name: string;
    files: ReadonlyArray<{ path: string; hash: string; code: string }>;
  }>;
  migrations: AsyncIterable<{
    version: number;
    name: string | null;
    hash: string;
    content: string;
  }>;
}

export type DeploymentLogSeverity = "INFO" | "ERROR" | "DEBUG" | "WARN";

export interface DeploymentLog {
  functionName: string;
  message: string;
  severity: DeploymentLogSeverity;
  timestamp: string;
  stacktrace?: string;
}

export interface Jet {
  createProject(args: CreateProjectArgs): Promise<Project>;
  updateConfiguration(args: UpdateConfigurationArgs): Promise<void>;
  createFunction(args: CreateFunctionArgs): Promise<void>;
  deleteFunction(args: DeleteFunctionArgs): Promise<void>;
  deployDraftFunctions(args: DeployDraftFunctionsArgs): Promise<void>;
  createFunctionFile(args: CreateFunctionFileArgs): Promise<void>;
  updateFunctionFile(args: UpdateFunctionFileArgs): Promise<void>;
  deleteFunctionFile(args: DeleteFunctionFileArgs): Promise<void>;
  createMigration(args: CreateMigrationArgs): Promise<void>;
  updateMigration(args: UpdateMigrationArgs): Promise<void>;
  deleteMigration(args: DeleteMigrationArgs): Promise<void>;
  migrateDB(args: MigrateDBArgs): Promise<void>;
  rollbackDB(args: RollbackDBArgs): Promise<void>;
  listMigrations(args: ListMigrationsArgs): Promise<Array<number>>;
  configurationHash(args: ConfigurationHashArgs): Promise<string>;
  commit(args: CommitArgs): Promise<void>;
  deploy(args: DeployArgs): Promise<void>;
  setEnvironmentVariable(args: SetEnvironmentVariableArgs): Promise<void>;
  unsetEnvironmentVariable(args: UnsetEnvironmentVariableArgs): Promise<void>;
  listEnvironmentVariables(
    args: ListEnvironmentVariablesArgs,
  ): Promise<Array<{ name: string; value: string }>>;
  cloneProject(args: CloneProjectArgs): Promise<JetProject>;
  pluginInstallInstance(args: PluginInstanceArgs): Promise<void>;
  pluginUninstallInstance(args: PluginInstanceArgs): Promise<void>;
  listDeploymentLogs(
    args: ListDeploymentLogsArgs,
  ): Promise<Array<DeploymentLog>>;
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
  deployDraftFunctions: logDebugMetricsWrapper(
    doDeployDraftFunctions,
    "deploy draft functions",
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
  configurationHash: logDebugMetricsWrapper(
    doConfigurationHash,
    "retrieve configuration hash",
  ),
  commit: logDebugMetricsWrapper(doCommit, "commit"),
  deploy: logDebugMetricsWrapper(doDeploy, "deploy"),
  setEnvironmentVariable: logDebugMetricsWrapper(
    doSetEnvironmentVariable,
    "set environment variable",
  ),
  unsetEnvironmentVariable: logDebugMetricsWrapper(
    doUnsetEnvironmentVariable,
    "unset environment variable",
  ),
  listEnvironmentVariables: logDebugMetricsWrapper(
    doListEnvironmentVariables,
    "list environment variables",
  ),
  cloneProject: logDebugMetricsWrapper(
    doCloneProject,
    "clone a Jet project",
  ),
  pluginInstallInstance: logDebugMetricsWrapper(
    doPluginInstallInstance,
    "plugin install instance",
  ),
  pluginUninstallInstance: logDebugMetricsWrapper(
    doPluginUninstallInstance,
    "plugin install instance",
  ),
  listDeploymentLogs: logDebugMetricsWrapper(
    doListDeploymentLogs,
    "list deployment logs",
  ),
};
