import { api, PROJECT_DB_PATH } from "@/api/mod.ts";

import {
  prepareQueries as preparePushConfigurationQueries,
  pushConfiguration,
} from "@/jcli/file/configuration-man.ts";

import {
  prepareQueries as preparePushFunctionQueries,
  pushFunctions,
} from "@/jcli/file/functions-man.ts";

import {
  prepareQueries as preparePushMigrationQueries,
  pushMigrations,
} from "@/jcli/file/migrations-man.ts";

import {
  prepareQueries as preparePushWorkflowQueries,
  pushWorkflows,
} from "@/jcli/file/workflows-man.ts";

import { includeCategories, PushOptions } from "./option.ts";

type PushFlags = {
  [K in (typeof includeCategories)[number]]: boolean;
};

function buildPushFlags(
  options: PushOptions,
): Readonly<PushFlags> {
  const includes = options.include ?? [...includeCategories];

  const defaultFlags = includeCategories.reduce<PushFlags>((acc, category) => {
    acc[category] = false;
    return acc;
  }, {} as PushFlags);

  return includes.reduce((acc, category) => {
    acc[category] = true;
    return acc;
  }, defaultFlags);
}

export default async function (options: PushOptions) {
  const db = await api.db.connect(PROJECT_DB_PATH);
  const pushFlags = buildPushFlags(options);

  const pushConfigurationQueries = pushFlags.configuration
    ? preparePushConfigurationQueries(db)
    : undefined;

  const pushFunctionQueries = pushFlags.function
    ? preparePushFunctionQueries(db)
    : undefined;

  const pushMigrationQueries = pushFlags.migration
    ? preparePushMigrationQueries(db)
    : undefined;

  const pushWorkflowQueries = pushFlags.workflow
    ? preparePushWorkflowQueries(db)
    : undefined;

  try {
    const [[projectId]] = db.query<[string]>("SELECT project_id FROM metadata");

    if (pushFlags.configuration) {
      api.console.log("Pushing configuration...");
      await pushConfiguration(pushConfigurationQueries!, projectId);
    }

    if (pushFlags.function) {
      api.console.log("Pushing functions...");
      await pushFunctions(pushFunctionQueries!, projectId);
    }

    if (pushFlags.migration) {
      api.console.log("Pushing migrations...");
      await pushMigrations(pushMigrationQueries!, projectId);
    }

    if (pushFlags.workflow) {
      api.console.log("Pushing workflows...");
      await pushWorkflows(pushWorkflowQueries!, projectId);
    }
  } finally {
    pushConfigurationQueries?.finalize();
    pushFunctionQueries?.finalize();
    pushMigrationQueries?.finalize();
    pushWorkflowQueries?.finalize();

    db.close();
  }
}
