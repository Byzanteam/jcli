import { join } from "path";

import { api, DBClass } from "@/api/mod.ts";
import {
  buildFileChange,
  FileChange,
  FileEntry,
  listFilesRec,
} from "@/jcli/file/files-man.ts";

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

export async function* diffFunctions(
  db: DBClass,
): AsyncIterable<FunctionChange> {
  const existingFunctionNames = db.query<[string]>("SELECT name FROM functions")
    .flat();

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

export async function* diffFunctionFiles(
  functionName: string,
  db: DBClass,
): AsyncIterable<FileChange<FileEntry>> {
  const functionPath = join(BASE_PATH, functionName);

  const existingFunctionHashes = new Map(db.query<[string, string]>(
    "SELECT path, hash FROM objects WHERE filetype = 'FUNCTION'",
  ));

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
