export interface FS {
  homePath(): string;
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
  homePath(): string {
    const homePath = Deno.env.get("HOME");

    if (homePath) {
      return homePath;
    }

    throw new Error("HOME not found");
  },
  mkdir: Deno.mkdir,
  readTextFile: Deno.readTextFile,
  writeTextFile: Deno.writeTextFile,
};
