import { extname, join } from "path";
import { api, DirEntry } from "@/api/mod.ts";
import { digest } from "@/jcli/crypto.ts";

export class FileEntry {
  #content: string | undefined;
  #digest: string | undefined;

  constructor(public readonly path: string) {}

  async digest(): Promise<string> {
    if (undefined === this.#digest) {
      const bytes = await api.fs.readFile(this.path);
      this.#digest = await digest(bytes);
      this.#content = new TextDecoder().decode(bytes);
    }

    return this.#digest;
  }

  async content(): Promise<string> {
    if (undefined === this.#content) {
      this.#content = await api.fs.readTextFile(this.path);
    }

    return this.#content;
  }
}

export interface FileChange<T extends FileEntry> {
  type: "CREATED" | "UPDATED" | "DELETED";
  entry: T;
}

function hasExtension(
  path: string,
  extension: ReadonlyArray<string> | string,
): boolean {
  const ext = extname(path);

  if (typeof extension === "string") {
    return ext === extension;
  } else {
    return extension.some((e) => ext === e);
  }
}

function filterFileByExtension(
  entry: DirEntry,
  extension?: ReadonlyArray<string> | string,
): boolean {
  if (!entry.isFile) return false;
  if (undefined === extension) return true;
  return hasExtension(entry.name, extension);
}

export async function buildFileChange<T extends FileEntry>(
  path: string,
  existingMigrationHashes: Map<string, string>,
  FileEntryConstructor: new (path: string) => T,
): Promise<FileChange<T> | undefined> {
  const entry = new FileEntryConstructor(path);
  const entryDigest = await entry.digest();

  if (!existingMigrationHashes.has(entry.path)) {
    return { type: "CREATED", entry };
  }

  if (entryDigest !== existingMigrationHashes.get!(entry.path)) {
    return {
      type: "UPDATED",
      entry,
    };
  }
}

/**
 * List all files with specific extensions in a directory.
 * If no extension is given, all files would be yielded.
 *
 * Example:
 *
 * Say we have:
 *
 *   src/
 *     - entry.ts
 *     - utility.ts
 *     - tsconfig.json
 *     - users/
 *       - more files...
 *
 *  > for await (const e of listFiles("./src", "ts")) {
 *      console.log(`Found: "${e}"`);
 *    }
 *  Found: "entry.ts"
 *  Found: "utility.ts"
 */
export async function* listFiles(
  path: string,
  extension?: ReadonlyArray<string> | string,
): AsyncIterable<string> {
  for await (const entry of api.fs.readDir(path)) {
    if (filterFileByExtension(entry, extension)) {
      yield entry.name;
    }
  }
}

/**
 * List all files with specific extensions in a directory recursively.
 * If no extension is given, all files would be yielded.
 *
 * Example:
 *
 * Say we have:
 *
 *   src/
 *     - entry.ts
 *     - tsconfig.json
 *     - users/
 *       - index.ts
 *       - _id/
 *         - show.ts
 *     - posts/
 *       - index.ts
 *
 *  > for await (const e of listFilesRec("./src", "ts")) {
 *      console.log(`Found: "${e}"`);
 *    }
 *  Found: "entry.ts"
 *  Found: "users/index.ts"
 *  Found: "users/_id/show.ts"
 *  Found: "posts/index.ts"
 */
export async function* listFilesRec(
  path: string,
  extension?: ReadonlyArray<string> | string,
): AsyncIterable<string> {
  for await (const entry of api.fs.readDir(path)) {
    if (entry.isDirectory) {
      for await (
        const subEntry of listFilesRec(join(path, entry.name), extension)
      ) {
        yield join(entry.name, subEntry);
      }
    } else if (filterFileByExtension(entry, extension)) {
      yield entry.name;
    }
  }
}
