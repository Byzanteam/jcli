import { GlobalOptions } from "@/args.ts";

import { api, PROJECT_DB_PATH } from "@/api/mod.ts";

import { Config } from "@/jcli/config/config.ts";
import {
  MetadataDotJSON,
  metadataDotJSONPath,
} from "@/jcli/config/metadata-json.ts";
import { diffMigrations } from "@/jcli/file/migrations-man.ts";

export default async function (_options: GlobalOptions) {
  const db = await api.db.connect(PROJECT_DB_PATH);

  const createMigrationQuery = db.prepareQuery<
    never,
    never,
    { path: string; hash: string }
  >(
    "INSERT INTO objects (path, hash, filetype) VALUES (:path, :hash, 'MIGRATION')",
  );

  const updateMigrationQuery = db.prepareQuery<
    never,
    never,
    { path: string; hash: string }
  >(
    "UPDATE objects SET hash = :hash WHERE path = :path",
  );

  const deleteMigrationQuery = db.prepareQuery<never, never, { path: string }>(
    "DELETE FROM objects WHERE path = :path",
  );

  try {
    const config = new Config<MetadataDotJSON>(metadataDotJSONPath());
    const { projectId } = await config.get();

    for await (const fileChange of diffMigrations(db)) {
      if (fileChange.type === "CREATED") {
        await api.jet.createMigration({
          projectUuid: projectId,
          version: await fileChange.entry.version(),
          content: await fileChange.entry.content(),
        });

        createMigrationQuery.execute({
          path: fileChange.entry.path,
          hash: await fileChange.entry.digest(),
        });
      }

      if (fileChange.type === "UPDATED") {
        await api.jet.updateMigration({
          projectUuid: projectId,
          migrationVersion: await fileChange.entry.version(),
          content: await fileChange.entry.content(),
        });

        updateMigrationQuery.execute({
          path: fileChange.entry.path,
          hash: await fileChange.entry.digest(),
        });
      }

      if (fileChange.type === "DELETED") {
        await api.jet.deleteMigration({
          projectUuid: projectId,
          migrationVersion: await fileChange.entry.version(),
        });

        deleteMigrationQuery.execute({ path: fileChange.entry.path });
      }
    }
  } finally {
    createMigrationQuery.finalize();
    updateMigrationQuery.finalize();
    deleteMigrationQuery.finalize();

    db.close();
  }
}
