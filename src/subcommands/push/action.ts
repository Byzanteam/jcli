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

import { PushOptions } from "./option.ts";

function buildFeatureFlags(
  options: PushOptions,
): {
  pushConfiguration: boolean;
  pushFunctions: boolean;
  pushMigrations: boolean;
} {
  if (options.onlyConfiguration) {
    return {
      pushConfiguration: true,
      pushFunctions: false,
      pushMigrations: false,
    };
  } else if (options.onlyFunctions) {
    return {
      pushConfiguration: false,
      pushFunctions: true,
      pushMigrations: false,
    };
  } else if (options.onlyMigrations) {
    return {
      pushConfiguration: false,
      pushFunctions: false,
      pushMigrations: true,
    };
  } else {
    return {
      pushConfiguration: true,
      pushFunctions: true,
      pushMigrations: true,
    };
  }
}

export default async function (options: PushOptions) {
  const db = await api.db.connect(PROJECT_DB_PATH);
  const flags = buildFeatureFlags(options);

  const pushConfigurationQueries = flags.pushConfiguration
    ? preparePushConfigurationQueries(db)
    : undefined;

  const pushFunctionQueries = flags.pushFunctions
    ? preparePushFunctionQueries(db)
    : undefined;

  const pushMigrationQueries = flags.pushMigrations
    ? preparePushMigrationQueries(db)
    : undefined;

  try {
    const [[projectId]] = db.prepare("SELECT project_id FROM metadata");

    if (flags.pushConfiguration) {
      api.console.log("Pushing configuration...");
      await pushConfiguration(pushConfigurationQueries!, projectId);
    }

    if (flags.pushFunctions) {
      api.console.log("Pushing functions...");
      await pushFunctions(pushFunctionQueries!, projectId);
    }

    if (flags.pushMigrations) {
      api.console.log("Pushing migrations...");
      await pushMigrations(pushMigrationQueries!, projectId);
    }
  } finally {
    pushConfigurationQueries?.finalize();
    pushFunctionQueries?.finalize();
    pushMigrationQueries?.finalize();

    db.close();
  }
}
