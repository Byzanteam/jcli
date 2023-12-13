import {
  DirEntry,
  FileInfo,
  FS,
  MkdirOptions,
  WriteFileOptions,
} from "@/api/fs.ts";

class File {
  content = "";
}

class Directory {
  #children: Map<string, Directory | File>;

  constructor() {
    this.#children = new Map();
  }

  static normalizePath(path: string): ReadonlyArray<string> {
    return path
      .split("/")
      .filter((elem) => "" !== elem && "." !== elem);
  }

  mkdirRec(
    [name, ...rest]: ReadonlyArray<string>,
    options: MkdirOptions,
  ): Directory | undefined {
    if (undefined === name) return undefined;

    if (0 === rest.length) return this.mkdir(name);

    const child = this.#children.get(name);

    if (!child && options.recursive) {
      this.mkdir(name);
      const dir = this.#children.get(name) as Directory;
      return dir.mkdirRec(rest, options);
    }

    return child && (child instanceof Directory)
      ? child.mkdirRec(rest, options)
      : undefined;
  }

  mkdir(name: string): Directory | undefined {
    if (!this.#children.has(name)) {
      const directory = new Directory();
      this.#children.set(name, directory);
      return directory;
    }
  }

  writeTextFile(
    path: string,
    data: string,
    options?: WriteFileOptions,
  ): File | undefined {
    if (options?.createNew && !this.#children.has(path)) {
      const file = new File();
      file.content = data;
      this.#children.set(path, file);
      return file;
    }

    if (!options?.createNew && this.#children.has(path)) {
      const directoryOrFile = this.#children.get(path);

      if (directoryOrFile instanceof File) {
        directoryOrFile.content = data;
        return directoryOrFile;
      }
    }
  }

  remove([name, ...rest]: ReadonlyArray<string>): void {
    if (undefined === name) {
      throw new Error("No such file or directory.");
    }

    if (0 === rest.length) {
      this._remove(name);
      return;
    }

    const fileOrDirectory = this.#children.get(name);

    if (fileOrDirectory instanceof Directory) {
      fileOrDirectory.remove(rest);
    } else {
      throw new Error("No such file or directory.");
    }
  }

  _remove(path: string): void {
    const directoryOrFile = this.#children.get(path);

    if (directoryOrFile instanceof Directory && !directoryOrFile.isEmpty()) {
      throw new Error(`${path} is not empty.`);
    }

    this.#children.delete(path);
  }

  isEmpty(): boolean {
    return this.#children.size === 0;
  }

  ls(): AsyncIterable<DirEntry> {
    const children = this.#children;

    return {
      async *[Symbol.asyncIterator](): AsyncGenerator<DirEntry> {
        for (const [name, directoryOrFile] of children) {
          yield {
            name,
            isDirectory: directoryOrFile instanceof Directory,
            isFile: directoryOrFile instanceof File,
            isSymlink: false,
          };
        }
      },
    };
  }

  getChildRec(
    [name, ...rest]: ReadonlyArray<string>,
  ): Directory | File | undefined {
    if (undefined === name) {
      return this;
    }

    const directoryOrFile = this.#children.get(name);

    if (directoryOrFile instanceof Directory) {
      return directoryOrFile.getChildRec(rest);
    }

    if (0 === rest.length) {
      return directoryOrFile;
    } else {
      return undefined;
    }
  }
}

export interface FSTest extends FS {
  chdir(path: string): void;
  hasDir(path: string): boolean;
  hasFile(path: string): boolean;
}

export function makeFS(): FSTest {
  const homePath = "~";
  let cwd = new Directory();
  cwd.mkdir(homePath);

  return {
    homePath(): string {
      return homePath;
    },

    mkdir(
      path: string,
      options: MkdirOptions = { recursive: false },
    ): Promise<void> {
      return new Promise((resolve, reject) => {
        cwd.mkdirRec(Directory.normalizePath(path), options)
          ? resolve()
          : reject(new Error(`Cannot mkdir "${path}"`));
      });
    },

    writeTextFile(
      path: string,
      data: string,
      options?: WriteFileOptions,
    ): Promise<void> {
      return new Promise((resolve, reject) => {
        const normalizedPath = Directory.normalizePath(path);

        if (
          normalizedPath.length === 1 &&
          cwd.writeTextFile(normalizedPath[0], data, options)
        ) {
          resolve();
        }

        if (normalizedPath.length > 1) {
          const filename = normalizedPath[normalizedPath.length - 1];
          const directoryOrFile = cwd.getChildRec(normalizedPath.slice(0, -1));

          if (directoryOrFile && directoryOrFile instanceof Directory) {
            if (directoryOrFile.writeTextFile(filename, data, options)) {
              resolve();
            }
          }
        }

        reject(new Error("Cannot write file"));
      });
    },

    async readFile(path: string): Promise<Uint8Array> {
      const content = await this.readTextFile(path);
      const encoder = new TextEncoder();
      return encoder.encode(content);
    },

    readTextFile(path: string): Promise<string> {
      return new Promise((resolve, reject) => {
        const directoryOrFile = cwd.getChildRec(Directory.normalizePath(path));

        if (directoryOrFile && directoryOrFile instanceof File) {
          resolve(directoryOrFile.content);
        }

        reject(new Error("Cannot read file"));
      });
    },

    readDir(path: string): AsyncIterable<DirEntry> {
      const directoryOrFile = cwd.getChildRec(Directory.normalizePath(path));

      if (directoryOrFile && directoryOrFile instanceof Directory) {
        return directoryOrFile.ls();
      }

      throw new Error(`${path} is not a directory.`);
    },

    remove(path: string): Promise<void> {
      return new Promise((resolve) => {
        const normalizedPath = Directory.normalizePath(path);
        cwd.remove(normalizedPath);
        resolve();
      });
    },

    lstat(path: string): Promise<FileInfo> {
      return new Promise((resolve, reject) => {
        const directoryOrFile = cwd.getChildRec(Directory.normalizePath(path));

        if (directoryOrFile) {
          resolve({
            isDirectory: directoryOrFile instanceof Directory,
            isFile: directoryOrFile instanceof File,
            isSymlink: false,
          });
        } else {
          reject(new Error(`No such file or directory: ${path}`));
        }
      });
    },

    realPath(path: string): Promise<string> {
      return Promise.resolve(path);
    },

    chdir(path: string): void {
      const directoryOrFile = cwd.getChildRec(Directory.normalizePath(path));

      if (directoryOrFile && directoryOrFile instanceof Directory) {
        cwd = directoryOrFile;
      } else {
        throw new Error(`Cannot chdir to "${path}"`);
      }
    },

    hasFile(path: string): boolean {
      const directoryOrFile = cwd.getChildRec(Directory.normalizePath(path));
      return !!directoryOrFile && directoryOrFile instanceof File;
    },

    hasDir(path: string): boolean {
      const directoryOrFile = cwd.getChildRec(Directory.normalizePath(path));
      return !!directoryOrFile && directoryOrFile instanceof Directory;
    },
  };
}
