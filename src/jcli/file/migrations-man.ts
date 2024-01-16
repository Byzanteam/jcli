import { join, parse } from "path";
import { PreparedQuery } from "sqlite";

import { api, DBClass } from "@/api/mod.ts";
import {
  FileChange,
  FileEntry,
  listFiles,
  zipFiles,
} from "@/jcli/file/files-man.ts";

import { digest } from "@/jcli/crypto.ts";

import { chunk } from "@/utility/async-iterable.ts";

export const BASE_PATH = "./migrations";

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
  #properties?: { version: number; name: string | null };
  #entryWas?: MigrationFileEntry;

  constructor(path: string) {
    super(path);
  }

  async digest(): Promise<string> {
    if (undefined === this._digest) {
      const encoder = new TextEncoder();

      let subject: string;

      if (this.name) {
        subject = `${this.version}${this.name}${await this.content()}`;
      } else {
        subject = `${this.version}${await this.content()}`;
      }

      this._digest = await digest(encoder.encode(subject));
    }

    return this._digest;
  }

  async setDiff(entry: MigrationFileEntry): Promise<boolean> {
    if (
      this.name === entry.name && await this.digest() === await entry.digest()
    ) {
      return false;
    }

    this.#entryWas = entry;
    return true;
  }

  async getDiff(): Promise<{ name?: string | null; content?: string }> {
    if (!this.#entryWas) throw new Error("Diff not set");

    return {
      name: this.name === this.#entryWas.name ? undefined : this.name,
      content: await this.digest() === await this.#entryWas.digest()
        ? undefined
        : await this.content(),
    };
  }

  setDigest(digest: string): MigrationFileEntry {
    this._digest = digest;
    return this;
  }

  get version(): number {
    this.#parseProperties();
    return this.#properties!.version;
  }

  get name(): string | null {
    this.#parseProperties();
    return this.#properties!.name;
  }

  get pathWas(): string {
    if (!this.#entryWas) throw new Error("Diff not set");
    return this.#entryWas.path;
  }

  #parseProperties(): void {
    if (undefined !== this.#properties) return;

    const { name } = parse(this.path);
    const result = MIGRATION_FILENAME_FORMAT.exec(name);

    if (result === null) {
      throw new Error(`Invalid migration filename ${name}`);
    }

    this.#properties = {
      version: parseInt(result!.groups!.version, 10),
      name: result!.groups!.name ?? null,
    };
  }
}

async function* listMigrationFileEntries(): AsyncIterable<
  [key: number, entry: MigrationFileEntry]
> {
  for await (const relativePath of listFiles(BASE_PATH, ".sql")) {
    const path = join(BASE_PATH, relativePath);
    const entry = new MigrationFileEntry(path);

    yield [entry.version, entry];
  }
}

export interface FileNotChanged<T extends FileEntry> {
  type: "NOT_CHANGED";
  entry: T;
}

export type FileStatus<T extends FileEntry> = FileChange<T> | FileNotChanged<T>;

export async function* getMigrationsStatus(
  listMigrationHashesQuery: () => ReadonlyArray<[path: string, hash: string]>,
): AsyncIterable<FileStatus<MigrationFileEntry>> {
  const migrationsWas = new Map<number, MigrationFileEntry>(
    listMigrationHashesQuery().map(([path, hash]) => {
      const entry = new MigrationFileEntry(path).setDigest(hash);
      return [entry.version, entry];
    }),
  );

  for await (
    const [entryWas, entry] of zipFiles(
      migrationsWas,
      listMigrationFileEntries(),
    )
  ) {
    if (!entryWas) {
      yield { type: "CREATED", entry };
    } else if (!entry) {
      yield { type: "DELETED", entry: entryWas };
    } else if (await entry.setDiff(entryWas)) {
      yield { type: "UPDATED", entry };
    } else {
      yield { type: "NOT_CHANGED", entry };
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
    { pathWas: string; path: string; hash: string }
  >;

  deleteMigrationQuery: PreparedQuery<
    never,
    never,
    { path: string }
  >;

  finalize(): void;
}

export function listMigrationHashesQuery(db: DBClass) {
  return db.query<[path: string, hash: string]>(
    "SELECT path, hash FROM objects WHERE filetype = 'MIGRATION'",
  );
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
    { pathWas: string; path: string; hash: string }
  >(
    "UPDATE objects SET hash = :hash, path = :path WHERE path = :pathWas",
  );

  const deleteMigrationQuery = db.prepareQuery<never, never, { path: string }>(
    "DELETE FROM objects WHERE path = :path",
  );

  return {
    listMigrationHashesQuery() {
      return listMigrationHashesQuery(db);
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

async function pushMigrationsChange(
  change: FileStatus<MigrationFileEntry>,
  queries: PushMigrationQueries,
  projectId: string,
) {
  const {
    createMigrationQuery,
    updateMigrationQuery,
    deleteMigrationQuery,
  } = queries;

  switch (change.type) {
    case "CREATED":
      await api.jet.createMigration({
        projectId,
        version: change.entry.version,
        name: change.entry.name,
        content: await change.entry.content(),
      });

      createMigrationQuery.execute({
        path: change.entry.path,
        hash: await change.entry.digest(),
      });

      break;

    case "UPDATED":
      await api.jet.updateMigration({
        projectId,
        migrationVersion: change.entry.version,
        ...await change.entry.getDiff(),
      });

      updateMigrationQuery.execute({
        pathWas: change.entry.pathWas,
        path: change.entry.path,
        hash: await change.entry.digest(),
      });

      break;

    case "DELETED":
      await api.jet.deleteMigration({
        projectId,
        migrationVersion: change.entry.version,
      });

      deleteMigrationQuery.execute({ path: change.entry.path });

      break;
  }
}

export interface PushMigrationsOptions {
  concurrency?: number;
}

export async function pushMigrations(
  queries: PushMigrationQueries,
  projectId: string,
  options?: PushMigrationsOptions,
): Promise<void> {
  for await (
    const fileChanges of chunk(
      getMigrationsStatus(queries.listMigrationHashesQuery),
      options?.concurrency ?? navigator.hardwareConcurrency,
    )
  ) {
    await Promise.allSettled(
      fileChanges.map((change) =>
        pushMigrationsChange(change, queries, projectId)
      ),
    );
  }
}
