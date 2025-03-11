import { join, relative } from "path";

import { chunk } from "@/utility/async-iterable.ts";

import { api, DBClass, PROJECT_ASSETS_DIRECTORY } from "@/api/mod.ts";
import {
  FileChange,
  FileEntry,
  listFilesRec,
  zipFiles,
} from "@/jcli/file/files-man.ts";
import { digest } from "@/jcli/crypto.ts";

import { PreparedQuery } from "sqlite";

const BASE_PATH = "functions";

interface FunctionFileEntryBase {
  serverPath: string;
  setDigest(digest: string): void;
}

/**
 * We store function files in database with full paths like:
 *   functions/my_func/users/index.ts
 *
 * But push function files to Jet with scoped paths like:
 *   users/index.ts
 */
export function FunctionFileEntry(functionName: string) {
  return class extends FileEntry implements FunctionFileEntryBase {
    readonly serverPath: string;

    constructor(relativePath: string) {
      super(join(BASE_PATH, functionName, relativePath));
      this.serverPath = join("/", relativePath);
    }

    override async digest() {
      if (undefined === this._digest) {
        const encoder = new TextEncoder();
        const serverPath = encoder.encode(this.serverPath);

        const code = await this.code();

        const data = new Uint8Array(serverPath.length + code.length);
        data.set(serverPath);
        data.set(code, serverPath.length);

        this._digest = await digest(data);
      }

      return this._digest;
    }

    setDigest(digest: string) {
      this._digest = digest;
    }
  };
}

export interface FunctionChange {
  type: "CREATED" | "UPDATED" | "DELETED";
  name: string;
}

function buildFunctionChange(
  name: string,
  existingFunctionNames: ReadonlyArray<string>,
): FunctionChange {
  if (!existingFunctionNames.includes(name)) {
    return { type: "CREATED", name };
  } else {
    return { type: "UPDATED", name };
  }
}

async function* diffFunctions(
  listFunctionNamesQuery: () => ReadonlyArray<string>,
): AsyncIterable<FunctionChange> {
  const existingFunctionNames = listFunctionNamesQuery();
  const newFunctionNames = new Set<string>();

  const root = join(PROJECT_ASSETS_DIRECTORY, BASE_PATH);
  const directory = await api.fs.realPath(root);

  for await (const e of api.fs.readDir(directory)) {
    if (e.isDirectory) {
      newFunctionNames.add(e.name);

      yield buildFunctionChange(e.name, existingFunctionNames);
    }
  }

  for (const name of existingFunctionNames) {
    if (!newFunctionNames.has(name)) {
      yield { type: "DELETED", name };
    }
  }
}

function buildFunctionFileRelativePath(
  path: string,
  functionName: string,
): string {
  /* functions/my_func/users/index.ts -> users/index.ts */
  return relative(join(BASE_PATH, functionName), path);
}

async function* listFunctionFileEntries<T extends FileEntry>(
  functionName: string,
  FileEntryConstructor: new (path: string) => T,
): AsyncIterable<[path: string, entry: T]> {
  const functionPath = join(BASE_PATH, functionName);
  const directoryPath = join(PROJECT_ASSETS_DIRECTORY, functionPath);

  for await (const path of listFilesRec(directoryPath)) {
    yield [join(functionPath, path), new FileEntryConstructor(path)];
  }
}

async function* diffFunctionFiles<
  T extends FileEntry & FunctionFileEntryBase,
>(
  functionName: string,
  listFunctionFileHashesQuery: () => ReadonlyArray<
    [path: string, hash: string]
  >,
  FileEntryConstructor: new (path: string) => T,
): AsyncIterable<FileChange<T>> {
  const prefix = join(BASE_PATH, functionName);

  const functionFilesWas = new Map<string, T>(
    listFunctionFileHashesQuery()
      .filter(([path]) => path.startsWith(prefix))
      .map(([path, hash]) => {
        const entry = new FileEntryConstructor(
          buildFunctionFileRelativePath(path, functionName),
        );
        entry.setDigest(hash);
        return [path, entry];
      }),
  );

  for await (
    const [entryWas, entry] of zipFiles(
      functionFilesWas,
      listFunctionFileEntries(functionName, FileEntryConstructor),
    )
  ) {
    if (!entryWas) {
      yield { type: "CREATED", entry: entry! };
    } else if (!entry) {
      yield { type: "DELETED", entry: entryWas };
    } else if (await entry.digest() !== await entryWas.digest()) {
      yield { type: "UPDATED", entry };
    }
  }
}

export interface PushFunctionQueries {
  listFunctionNamesQuery(): ReadonlyArray<string>;

  listFunctionFileHashesQuery(): ReadonlyArray<[path: string, hash: string]>;

  createFunctionQuery: PreparedQuery<never, never, { name: string }>;
  deleteFunctionQuery: PreparedQuery<never, never, { name: string }>;

  createFunctionFileQuery: PreparedQuery<
    never,
    never,
    { path: string; hash: string }
  >;

  updateFunctionFileQuery: PreparedQuery<
    never,
    never,
    { path: string; hash: string }
  >;

  deleteFunctionFileQuery: PreparedQuery<never, never, { path: string }>;

  finalize(): void;
}

export function prepareQueries(db: DBClass): PushFunctionQueries {
  const createFunctionQuery = db.prepareQuery<
    never,
    never,
    { name: string }
  >(
    "INSERT INTO functions (name) VALUES (:name)",
  );

  const deleteFunctionQuery = db.prepareQuery<never, never, { name: string }>(
    "DELETE FROM functions WHERE name = :name",
  );

  const createFunctionFileQuery = db.prepareQuery<
    never,
    never,
    { path: string; hash: string }
  >(
    "INSERT INTO objects (path, hash, filetype) VALUES (:path, :hash, 'FUNCTION')",
  );

  const updateFunctionFileQuery = db.prepareQuery<
    never,
    never,
    { path: string; hash: string }
  >(
    "UPDATE objects SET hash = :hash WHERE path = :path",
  );

  const deleteFunctionFileQuery = db.prepareQuery<
    never,
    never,
    { path: string }
  >(
    "DELETE FROM objects WHERE path = :path",
  );

  return {
    listFunctionNamesQuery() {
      return db.query<[string]>("SELECT name FROM functions").flat();
    },

    listFunctionFileHashesQuery() {
      return db.query<[string, string]>(
        "SELECT path, hash FROM objects WHERE filetype = 'FUNCTION'",
      );
    },

    createFunctionQuery,
    deleteFunctionQuery,
    createFunctionFileQuery,
    updateFunctionFileQuery,
    deleteFunctionFileQuery,
    finalize() {
      createFunctionQuery.finalize();
      deleteFunctionQuery.finalize();
      createFunctionFileQuery.finalize();
      updateFunctionFileQuery.finalize();
      deleteFunctionFileQuery.finalize();
    },
  };
}

export interface PushFunctionsOptions {
  concurrency?: number;
}

async function pushFunctionFile<T extends FileEntry & FunctionFileEntryBase>(
  fileChange: FileChange<T>,
  queries: PushFunctionQueries,
  projectId: string,
  functionName: string,
): Promise<void> {
  const {
    createFunctionFileQuery,
    updateFunctionFileQuery,
    deleteFunctionFileQuery,
  } = queries;

  switch (fileChange.type) {
    case "CREATED":
      await api.jet.createFunctionFile({
        projectId,
        functionName,
        path: fileChange.entry.serverPath,
        code: await fileChange.entry.encodedCode(),
      });

      createFunctionFileQuery.execute({
        path: fileChange.entry.path,
        hash: await fileChange.entry.digest(),
      });

      break;

    case "UPDATED":
      await api.jet.updateFunctionFile({
        projectId,
        functionName,
        path: fileChange.entry.serverPath,
        code: await fileChange.entry.encodedCode(),
      });

      updateFunctionFileQuery.execute({
        path: fileChange.entry.path,
        hash: await fileChange.entry.digest(),
      });

      break;

    case "DELETED":
      await api.jet.deleteFunctionFile({
        projectId,
        functionName,
        path: fileChange.entry.serverPath,
      });

      deleteFunctionFileQuery.execute({ path: fileChange.entry.path });

      break;
  }
}

async function pushFunctionFiles(
  queries: PushFunctionQueries,
  projectId: string,
  functionName: string,
  options?: PushFunctionsOptions,
): Promise<void> {
  for await (
    const changes of chunk(
      diffFunctionFiles(
        functionName,
        queries.listFunctionFileHashesQuery,
        FunctionFileEntry(functionName),
      ),
      options?.concurrency ?? navigator.hardwareConcurrency,
    )
  ) {
    await Promise.all(
      changes.map((fileChange) =>
        pushFunctionFile(fileChange, queries, projectId, functionName)
      ),
    );
  }
}

async function pushFunction(
  change: FunctionChange,
  queries: PushFunctionQueries,
  projectId: string,
  options?: PushFunctionsOptions,
): Promise<void> {
  const {
    createFunctionQuery,
    deleteFunctionQuery,
  } = queries;

  switch (change.type) {
    case "CREATED":
      await api.jet.createFunction({
        projectId,
        name: change.name,
        title: change.name,
      });

      createFunctionQuery.execute({ name: change.name });

      break;

    case "DELETED":
      await api.jet.deleteFunction({
        projectId,
        functionName: change.name,
      });

      deleteFunctionQuery.execute({ name: change.name });

      break;

    default:
      break;
  }

  if (change.type !== "DELETED") {
    await pushFunctionFiles(queries, projectId, change.name, options);
  }
}

export async function pushFunctions(
  queries: PushFunctionQueries,
  projectId: string,
  options?: PushFunctionsOptions,
): Promise<void> {
  for await (
    const changes of chunk(
      diffFunctions(queries.listFunctionNamesQuery),
      options?.concurrency ?? navigator.hardwareConcurrency,
    )
  ) {
    await Promise.all(
      changes.map((change) =>
        pushFunction(change, queries, projectId, options)
      ),
    );
  }
}
