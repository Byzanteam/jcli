import { parse } from "path";
import { PreparedQuery } from "sqlite";

import { api, DBClass } from "@/api/mod.ts";
import {
  buildFileChange,
  FileChange,
  FileEntry,
  listFiles,
} from "@/jcli/file/files-man.ts";

const BASE_PATH = "./migrations";

/**
 * A migration filename looks like:
 *   202301010101.sql or
 *   202301010101_abc.sql
 * The leading number is the version and the optional trailing string is the name.
 * The length of the version must be 12. The name is consisted of lowercase letters,
 * numbers, and underscores.
 */
const MIGRATION_FILENAME_FORMAT =
  /^(?<version>\d{12})(_(?<name>[a-z0-9_]{0,26}))?$/;

export class MigrationFileEntry extends FileEntry {
  #version: number | undefined;

  constructor(path: string) {
    super(path);
  }

  version(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (undefined === this.#version) {
        const { name } = parse(this.path);
        const result = MIGRATION_FILENAME_FORMAT.exec(name);

        if (result === null) {
          reject(new Error(`Invalid migration filename ${name}`));
        }

        this.#version = parseInt(result!.groups!.version, 10);
      }

      resolve(this.#version);
    });
  }
}

async function* diffMigrations(
  listMigrationHashesQuery: () => ReadonlyArray<[path: string, hash: string]>,
): AsyncIterable<FileChange<MigrationFileEntry>> {
  const existingMigrationHashes = new Map(listMigrationHashesQuery());

  const newMigrationPaths = new Set<string>();

  for await (const path of listFiles(BASE_PATH, ".sql")) {
    newMigrationPaths.add(path);

    const fileChange = await buildFileChange(
      path,
      existingMigrationHashes,
      MigrationFileEntry,
    );

    if (fileChange) {
      yield fileChange;
    }
  }

  for (const path of existingMigrationHashes.keys()) {
    if (!newMigrationPaths.has(path)) {
      yield { type: "DELETED", entry: new MigrationFileEntry(path) };
    }
  }
}

export interface PushMigrationQueries {
  listMigrationHashesQuery(): ReadonlyArray<[path: string, hash: string]>;

  createMigrationQuery: PreparedQuery<
    never,
    never,
    { path: string; hash: string }
  >;

  updateMigrationQuery: PreparedQuery<
    never,
    never,
    { path: string; hash: string }
  >;

  deleteMigrationQuery: PreparedQuery<
    never,
    never,
    { path: string }
  >;

  finalize(): void;
}

export function prepareQueries(db: DBClass): PushMigrationQueries {
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

  return {
    listMigrationHashesQuery() {
      return db.query<[path: string, hash: string]>(
        "SELECT path, hash FROM objects WHERE filetype = 'MIGRATION'",
      );
    },
    createMigrationQuery,
    updateMigrationQuery,
    deleteMigrationQuery,
    finalize() {
      createMigrationQuery.finalize();
      updateMigrationQuery.finalize();
      deleteMigrationQuery.finalize();
    },
  };
}

export async function pushMigrations(
  queries: PushMigrationQueries,
  projectUuid: string,
): Promise<void> {
  const {
    listMigrationHashesQuery,
    createMigrationQuery,
    updateMigrationQuery,
    deleteMigrationQuery,
  } = queries;

  for await (const fileChange of diffMigrations(listMigrationHashesQuery)) {
    switch (fileChange.type) {
      case "CREATED":
        await api.jet.createMigration({
          projectUuid,
          version: await fileChange.entry.version(),
          content: await fileChange.entry.content(),
        });

        createMigrationQuery.execute({
          path: fileChange.entry.path,
          hash: await fileChange.entry.digest(),
        });

        break;

      case "UPDATED":
        await api.jet.updateMigration({
          projectUuid,
          migrationVersion: await fileChange.entry.version(),
          content: await fileChange.entry.content(),
        });

        updateMigrationQuery.execute({
          path: fileChange.entry.path,
          hash: await fileChange.entry.digest(),
        });

        break;

      case "DELETED":
        await api.jet.deleteMigration({
          projectUuid,
          migrationVersion: await fileChange.entry.version(),
        });

        deleteMigrationQuery.execute({ path: fileChange.entry.path });

        break;
    }
  }
}
