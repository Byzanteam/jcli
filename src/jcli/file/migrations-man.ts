import { parse } from "path";

import { DBClass } from "@/api/mod.ts";
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

export async function* diffMigrations(
  db: DBClass,
): AsyncIterable<FileChange<MigrationFileEntry>> {
  const existingMigrationHashes = new Map(db.query<[string, string]>(
    "SELECT path, hash FROM objects WHERE filetype = 'MIGRATION'",
  ));

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
