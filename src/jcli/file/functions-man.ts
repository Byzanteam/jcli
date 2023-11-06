import { join } from "path";

import { api, DBClass } from "@/api/mod.ts";
import {
  buildFileChange,
  FileChange,
  FileEntry,
  listFilesRec,
} from "@/jcli/file/files-man.ts";
import { PreparedQuery } from "sqlite";

const BASE_PATH = "./functions";

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

async function* diffFunctionFiles(
  functionName: string,
  listFunctionFileHashesQuery: () => ReadonlyArray<
    [path: string, hash: string]
  >,
): AsyncIterable<FileChange<FileEntry>> {
  const functionPath = join(BASE_PATH, functionName);

  const existingFunctionHashes = new Map(listFunctionFileHashesQuery());
  const newFunctionPaths = new Set<string>();

  for await (const path of listFilesRec(functionPath, ".ts")) {
    newFunctionPaths.add(path);

    const fileChange = await buildFileChange(
      path,
      existingFunctionHashes,
      FileEntry,
    );

    if (fileChange) {
      yield fileChange;
    }
  }

  for (const path of existingFunctionHashes.keys()) {
    if (!newFunctionPaths.has(path)) {
      yield { type: "DELETED", entry: new FileEntry(path) };
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

export async function pushFunctions(
  queries: PushFunctionQueries,
  projectUuid: string,
): Promise<void> {
  const {
    listFunctionNamesQuery,
    listFunctionFileHashesQuery,
    createFunctionQuery,
    deleteFunctionQuery,
    createFunctionFileQuery,
    updateFunctionFileQuery,
    deleteFunctionFileQuery,
  } = queries;

  for await (const change of diffFunctions(listFunctionNamesQuery)) {
    if (change.type === "CREATED") {
      await api.jet.createFunction({
        projectUuid,
        name: change.name,
        title: change.name,
      });

      createFunctionQuery.execute({ name: change.name });
    }

    if (change.type === "DELETED") {
      await api.jet.deleteFunction({
        projectUuid,
        functionName: change.name,
      });

      deleteFunctionQuery.execute({ name: change.name });
    }

    if (change.type !== "DELETED") {
      for await (
        const fileChange of diffFunctionFiles(
          change.name,
          listFunctionFileHashesQuery,
        )
      ) {
        if (fileChange.type === "CREATED") {
          await api.jet.createFunctionFile({
            projectUuid,
            functionName: change.name,
            path: fileChange.entry.path,
            content: await fileChange.entry.content(),
          });

          createFunctionFileQuery.execute({
            path: fileChange.entry.path,
            hash: await fileChange.entry.digest(),
          });
        }

        if (fileChange.type === "UPDATED") {
          await api.jet.updateFunctionFile({
            projectUuid,
            functionName: change.name,
            path: fileChange.entry.path,
            content: await fileChange.entry.content(),
          });

          updateFunctionFileQuery.execute({
            path: fileChange.entry.path,
            hash: await fileChange.entry.digest(),
          });
        }

        if (fileChange.type === "DELETED") {
          await api.jet.deleteFunctionFile({
            projectUuid,
            functionName: change.name,
            path: fileChange.entry.path,
          });

          deleteFunctionFileQuery.execute({ path: fileChange.entry.path });
        }
      }
    }
  }
}
