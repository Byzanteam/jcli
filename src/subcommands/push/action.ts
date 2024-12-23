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

import { PushOptions } from "./option.ts";

function buildFeatureFlags(
  options: PushOptions,
): {
  pushConfiguration: boolean;
  pushFunctions: boolean;
  pushMigrations: boolean;
  pushWorkflows: boolean;
} {
  if (options.onlyConfiguration) {
    return {
      pushConfiguration: true,
      pushFunctions: false,
      pushMigrations: false,
      pushWorkflows: false,
    };
  } else if (options.onlyFunctions) {
    return {
      pushConfiguration: false,
      pushFunctions: true,
      pushMigrations: false,
      pushWorkflows: false,
    };
  } else if (options.onlyMigrations) {
    return {
      pushConfiguration: false,
      pushFunctions: false,
      pushMigrations: true,
      pushWorkflows: false,
    };
  } else if (options.onlyWorkflows) {
    return {
      pushConfiguration: false,
      pushFunctions: false,
      pushMigrations: false,
      pushWorkflows: true,
    };
  } else {
    return {
      pushConfiguration: true,
      pushFunctions: true,
      pushMigrations: true,
      pushWorkflows: true,
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

  const pushWorkflowQueries = flags.pushWorkflows
    ? preparePushWorkflowQueries(db)
    : undefined;

  try {
    const [[projectId]] = db.query<[string]>("SELECT project_id FROM metadata");

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

    if (flags.pushWorkflows) {
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
