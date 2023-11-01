import { getConfig } from "@/api/mod.ts";

import {
  createMigration as doCreateMigration,
  createProject as doCreateProject,
  deleteMigration as doDeleteMigration,
  updateMigration as doUpdateMigration,
} from "@/api/jet/mod.ts";

import { JcliConfigDotJSON } from "@/jcli/config/jcli-config-json.ts";
import { getLogger } from "@/jcli/logger.ts";
import { Project } from "@/jet/project.ts";

export interface CreateProjectArgs {
  name: string;
  title: string;
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

export interface Jet {
  createProject(args: CreateProjectArgs): Promise<Project>;
  createMigration(args: CreateMigrationArgs): Promise<void>;
  updateMigration(args: UpdateMigrationArgs): Promise<void>;
  deleteMigration(args: DeleteMigrationArgs): Promise<void>;
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
  createMigration: logDebugMetricsWrapper(
    doCreateMigration,
    "create migration",
  ),
  updateMigration: logDebugMetricsWrapper(
    doUpdateMigration,
    "update migration",
  ),
  deleteMigration: logDebugMetricsWrapper(
    doDeleteMigration,
    "delete migration",
  ),
};
