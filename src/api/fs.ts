export interface FS {
  homePath(): string;
  mkdir(path: string, options?: MkdirOptions): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  readTextFile(path: string): Promise<string>;
  remove(path: string): Promise<void>;
  writeFile(
    path: string,
    data: Uint8Array,
    options?: WriteFileOptions,
  ): Promise<void>;
  writeTextFile(
    path: string,
    data: string,
    options?: WriteFileOptions,
  ): Promise<void>;
  readDir(path: string): AsyncIterable<DirEntry>;
  lstat(path: string): Promise<FileInfo>;
  realPath(path: string): Promise<string>;
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
  writeFile: Deno.writeFile,
  writeTextFile: Deno.writeTextFile,
  readDir: Deno.readDir,
  lstat: Deno.lstat,
  realPath: Deno.realPath,
};

export function uint8ArrayToBase64(uint8Array: Uint8Array) {
  let binary = "";
  uint8Array.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary);
}

export function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const uint8Array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    uint8Array[i] = binary.charCodeAt(i);
  }

  return uint8Array;
}
