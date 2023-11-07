import { join } from "path";

import { chunk } from "@/utility/async-iterable.ts";

import { api, DBClass } from "@/api/mod.ts";
import {
  buildFileChange,
  FileChange,
  FileEntry,
  listFilesRec,
} from "@/jcli/file/files-man.ts";
import { PreparedQuery } from "sqlite";

const BASE_PATH = "./functions";

interface WithServerPath {
  serverPath: string;
}

/**
 * We store function files in database with full paths like:
 *   functions/my_func/users/index.ts
 *
 * But push function files to Jet with scoped paths like:
 *   users/index.ts
 */
function FunctionFileEntry(functionName: string) {
  return class extends FileEntry implements WithServerPath {
    readonly serverPath: string;

    constructor(relativePath: string) {
      super(join(BASE_PATH, functionName, relativePath));
      this.serverPath = join("/", relativePath);
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

  for await (const e of api.fs.readDir(BASE_PATH)) {
    if (e.isDirectory) {
      newFunctionNames.add(e.name);

      const change = buildFunctionChange(e.name, existingFunctionNames);

      if (change) yield change;
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
  /*    basePathLength = "./functions"     - "./" + "/" + "my_func" */
  const basePathLength = (BASE_PATH.length - 2) + 1 + functionName.length;
  /* functions/my_func/users/index.ts -> users/index.ts */
  return path.slice(basePathLength + 1);
}

async function* diffFunctionFiles<T extends FileEntry & WithServerPath>(
  functionName: string,
  listFunctionFileHashesQuery: () => ReadonlyArray<
    [path: string, hash: string]
  >,
  FileEntryConstructor: new (path: string) => T,
): AsyncIterable<FileChange<T>> {
  const functionPath = join(BASE_PATH, functionName);

  const existingFunctionHashes = new Map(listFunctionFileHashesQuery());
  const newFunctionPaths = new Set<string>();

  for await (const relativePath of listFilesRec(functionPath)) {
    const path = join(BASE_PATH, functionName, relativePath);
    newFunctionPaths.add(path);

    const fileChange = await buildFileChange(
      relativePath,
      existingFunctionHashes,
      FileEntryConstructor,
    );

    if (fileChange) {
      yield fileChange;
    }
  }

  for (const path of existingFunctionHashes.keys()) {
    if (!newFunctionPaths.has(path)) {
      const relativePath = buildFunctionFileRelativePath(path, functionName);
      yield { type: "DELETED", entry: new FileEntryConstructor(relativePath) };
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

async function pushFunctionFile<T extends FileEntry & WithServerPath>(
  fileChange: FileChange<T>,
  queries: PushFunctionQueries,
  projectUuid: string,
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
        projectUuid,
        functionName,
        path: fileChange.entry.serverPath,
        code: await fileChange.entry.content(),
      });

      createFunctionFileQuery.execute({
        path: fileChange.entry.path,
        hash: await fileChange.entry.digest(),
      });

      break;

    case "UPDATED":
      await api.jet.updateFunctionFile({
        projectUuid,
        functionName,
        path: fileChange.entry.serverPath,
        code: await fileChange.entry.content(),
      });

      updateFunctionFileQuery.execute({
        path: fileChange.entry.path,
        hash: await fileChange.entry.digest(),
      });

      break;

    case "DELETED":
      await api.jet.deleteFunctionFile({
        projectUuid,
        functionName,
        path: fileChange.entry.serverPath,
      });

      deleteFunctionFileQuery.execute({ path: fileChange.entry.path });

      break;
  }
}

async function pushFunctionFiles(
  queries: PushFunctionQueries,
  projectUuid: string,
  functionName: string,
  options?: PushFunctionsOptions,
): Promise<void> {
  for await (
    const fileChanges of chunk(
      diffFunctionFiles(
        functionName,
        queries.listFunctionFileHashesQuery,
        FunctionFileEntry(functionName),
      ),
      options?.concurrency ?? navigator.hardwareConcurrency,
    )
  ) {
    await Promise.allSettled(
      fileChanges.map((fileChange) =>
        pushFunctionFile(fileChange, queries, projectUuid, functionName)
      ),
    );
  }
}

async function pushFunction(
  change: FunctionChange,
  queries: PushFunctionQueries,
  projectUuid: string,
  options?: PushFunctionsOptions,
): Promise<void> {
  const {
    createFunctionQuery,
    deleteFunctionQuery,
  } = queries;

  switch (change.type) {
    case "CREATED":
      await api.jet.createFunction({
        projectUuid,
        name: change.name,
        title: change.name,
      });

      createFunctionQuery.execute({ name: change.name });

      break;

    case "DELETED":
      await api.jet.deleteFunction({
        projectUuid,
        functionName: change.name,
      });

      deleteFunctionQuery.execute({ name: change.name });

      break;

    default:
      break;
  }

  if (change.type !== "DELETED") {
    await pushFunctionFiles(queries, projectUuid, change.name, options);
  }
}

export async function pushFunctions(
  queries: PushFunctionQueries,
  projectUuid: string,
  options?: PushFunctionsOptions,
): Promise<void> {
  for await (
    const changes of chunk(
      diffFunctions(queries.listFunctionNamesQuery),
      options?.concurrency ?? navigator.hardwareConcurrency,
    )
  ) {
    await Promise.allSettled(
      changes.map((change) =>
        pushFunction(change, queries, projectUuid, options)
      ),
    );
  }
}
