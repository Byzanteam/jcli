export interface FS {
  homePath(): string;
  mkdir(path: string, options?: MkdirOptions): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  readTextFile(path: string): Promise<string>;
  remove(path: string, options?: RemoveOptions): Promise<void>;
  writeTextFile(
    path: string,
    data: string,
    options?: WriteFileOptions,
  ): Promise<void>;
  readDir(path: string): AsyncIterable<DirEntry>;
  lstat(path: string): Promise<FileInfo>;
  realPath(path: string): Promise<string>;
  rename(oldPath: string, newPath: string): Promise<void>;
}

export interface MkdirOptions {
  recursive?: boolean;
}

export interface WriteFileOptions {
  createNew?: boolean;
}

export interface DirEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
}

export interface FileInfo {
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
}

export interface RemoveOptions {
  recursive: boolean;
}

export const fs: FS = {
  homePath(): string {
    const homePath = Deno.env.get("HOME");

    if (homePath) {
      return homePath;
    }

    throw new Error("HOME not found");
  },
  mkdir: Deno.mkdir,
  readTextFile: Deno.readTextFile,
  readFile: Deno.readFile,
  remove: Deno.remove,
  writeTextFile: Deno.writeTextFile,
  readDir: Deno.readDir,
  lstat: Deno.lstat,
  realPath: Deno.realPath,
  rename: Deno.rename,
};
