import { extname, join } from "path";
import { api, DirEntry, FS, PROJECT_ASSETS_DIRECTORY } from "@/api/mod.ts";
import { digest } from "@/jcli/crypto.ts";
import { uint8ArrayToBase64 } from "@/api/fs.ts";

export class FileEntry {
  #content: string | undefined;
  #code: Uint8Array | undefined;
  _digest: string | undefined;

  constructor(public readonly path: string) {}

  async digest(): Promise<string> {
    if (undefined === this._digest) {
      const path = await api.fs.realPath(this.path);
      const bytes = await api.fs.readFile(path);
      this._digest = await digest(bytes);
      this.#content = new TextDecoder().decode(bytes);
    }

    return this._digest;
  }

  async content(): Promise<string> {
    if (undefined === this.#content) {
      const path = join(PROJECT_ASSETS_DIRECTORY, this.path);
      const file = await api.fs.realPath(path);
      this.#content = await api.fs.readTextFile(file);
    }

    return this.#content;
  }

  async code(): Promise<Uint8Array> {
    if (undefined === this.#code) {
      const path = join(PROJECT_ASSETS_DIRECTORY, this.path);
      const file = await api.fs.realPath(path);
      this.#code = await api.fs.readFile(file);
    }

    return this.#code;
  }

  async encodedCode(): Promise<string> {
    const code = await this.code();
    return uint8ArrayToBase64(code);
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
  if (undefined === extension) return true;
  return hasExtension(entry.name, extension);
}

export async function* zipFiles<K, T extends FileEntry>(
  fileEntriesWas: Map<K, T>,
  fileEntries: AsyncIterable<[key: K, entry: T]>,
): AsyncIterable<
  [undefined, T] | [T, T] | [T, undefined]
> {
  const visitedKeys = new Set<K>();

  for await (const [key, entry] of fileEntries) {
    visitedKeys.add(key);
    yield [fileEntriesWas.get(key), entry] as [undefined, T] | [T, T];
  }

  for (const key of fileEntriesWas.keys()) {
    if (!visitedKeys.has(key)) {
      yield [fileEntriesWas.get(key)!, undefined];
    }
  }
}

export async function buildFileChange<T extends FileEntry>(
  path: string,
  existingMigrationHashes: Map<string, string>,
  FileEntryConstructor: new (path: string) => T,
): Promise<FileChange<T> | undefined> {
  const entry = new FileEntryConstructor(path);

  if (!existingMigrationHashes.has(entry.path)) {
    return { type: "CREATED", entry };
  }

  if (await entry.digest() !== existingMigrationHashes.get!(entry.path)) {
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
  const realPath = await api.fs.realPath(path);

  for await (const entry of api.fs.readDir(realPath)) {
    if (filterFileByExtension(entry, extension)) {
      yield entry.name;
    }
  }
}

export interface ListFilesRecOptions {
  extension?: ReadonlyArray<string> | string;
  fs?: FS;
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
  options?: ListFilesRecOptions,
): AsyncIterable<string> {
  const fs = options?.fs ?? api.fs;

  const realPath = await fs.realPath(path);

  for await (const entry of fs.readDir(realPath)) {
    if (await isDirectory(entry, path)) {
      for await (
        const subEntry of listFilesRec(join(path, entry.name), options)
      ) {
        yield join(entry.name, subEntry);
      }
    } else if (filterFileByExtension(entry, options?.extension)) {
      yield entry.name;
    }
  }
}

async function isDirectory(entry: DirEntry, prefix: string): Promise<boolean> {
  if (entry.isDirectory) return true;

  if (entry.isSymlink) {
    const realPath = await api.fs.realPath(join(prefix, entry.name));
    const info = await api.fs.lstat(realPath);
    return info.isDirectory;
  }

  return false;
}
