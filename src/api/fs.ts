export interface FS {
  mkdir(path: string): Promise<void>;
  readTextFile(path: string): Promise<string>;
  writeTextFile(
    path: string,
    data: string,
    options?: WriteFileOptions,
  ): Promise<void>;
}

export interface WriteFileOptions {
  createNew?: boolean;
}

export const fs: FS = {
  mkdir: Deno.mkdir,
  readTextFile: Deno.readTextFile,
  writeTextFile: Deno.writeTextFile,
};
