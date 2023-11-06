import { GlobalOptions } from "@/args.ts";

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

export default async function (_options: GlobalOptions) {
  const db = await api.db.connect(PROJECT_DB_PATH);

  const pushFunctionQueries = preparePushFunctionQueries(db);
  const pushMigrationQueries = preparePushMigrationQueries(db);

  try {
    const config = new Config<MetadataDotJSON>(metadataDotJSONPath());
    const { projectId } = await config.get();

    await pushFunctions(pushFunctionQueries, projectId);
    await pushMigrations(pushMigrationQueries, projectId);
  } finally {
    pushFunctionQueries.finalize();
    pushMigrationQueries.finalize();

    db.close();
  }
}
