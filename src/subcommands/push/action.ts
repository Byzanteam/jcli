import { api, PROJECT_DB_PATH } from "@/api/mod.ts";

import { Config } from "@/jcli/config/config.ts";
import {
  MetadataDotJSON,
  metadataDotJSONPath,
} from "@/jcli/config/metadata-json.ts";

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
): { pushFunctions: boolean; pushMigrations: boolean } {
  if (options.onlyFunctions) {
    return { pushFunctions: true, pushMigrations: false };
  } else if (options.onlyMigrations) {
    return { pushFunctions: false, pushMigrations: true };
  } else {
    return { pushFunctions: true, pushMigrations: true };
  }
}

export default async function (options: PushOptions) {
  const db = await api.db.connect(PROJECT_DB_PATH);
  const flags = buildFeatureFlags(options);

  const pushFunctionQueries = flags.pushFunctions
    ? preparePushFunctionQueries(db)
    : undefined;

  const pushMigrationQueries = flags.pushMigrations
    ? preparePushMigrationQueries(db)
    : undefined;

  try {
    const config = new Config<MetadataDotJSON>(metadataDotJSONPath());
    const { projectId } = await config.get();

    if (flags.pushFunctions) {
      api.console.log("Pushing functions...");
      await pushFunctions(pushFunctionQueries!, projectId);
    }

    if (flags.pushMigrations) {
      api.console.log("Pushing migrations...");
      await pushMigrations(pushMigrationQueries!, projectId);
    }
  } finally {
    pushFunctionQueries?.finalize();
    pushMigrationQueries?.finalize();

    db.close();
  }
}
