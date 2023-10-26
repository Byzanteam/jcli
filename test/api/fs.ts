import { FS, WriteFileOptions } from "@/api/fs.ts";

class File {
  content = "";
}

class Directory {
  #children: Map<string, Directory | File>;

  constructor() {
    this.#children = new Map();
  }

  static normalizePath = (path: string): ReadonlyArray<string> => {
    return path
      .split("/")
      .filter((elem) => "" !== elem && "." !== elem);
  };

  mkdirRec = (
    [name, ...rest]: ReadonlyArray<string>,
  ): Directory | undefined => {
    if (undefined === name) {
      return this;
    } else if (0 === rest.length) {
      return this.mkdir(name);
    } else {
      const directoryOrFile = this.#children.get(name);

      return directoryOrFile && (directoryOrFile instanceof Directory)
        ? directoryOrFile.mkdirRec(rest)
        : undefined;
    }
  };

  mkdir = (name: string): Directory | undefined => {
    if (!this.#children.has(name)) {
      const directory = new Directory();
      this.#children.set(name, directory);
      return directory;
    }
  };

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

  getChildRec = (
    [name, ...rest]: ReadonlyArray<string>,
  ): Directory | File | undefined => {
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
  };
}

export interface FSTest extends FS {
  hasDir(path: string): boolean;
}

export function makeFS(): FSTest {
  const cwd = new Directory();

  return {
    mkdir(path: string): Promise<void> {
      return new Promise((resolve, reject) => {
        cwd.mkdirRec(Directory.normalizePath(path))
          ? resolve()
          : reject(new Error(`Cannot mkdir "${path}"`));
      });
    },

    hasDir(path: string): boolean {
      const directoryOrFile = cwd.getChildRec(Directory.normalizePath(path));
      return !!directoryOrFile && directoryOrFile instanceof Directory;
    },

    writeTextFile(
      path: string,
      data: string,
      options?: WriteFileOptions,
    ): Promise<void> {
      return new Promise((resolve, reject) => {
        const normalizedPath = Directory.normalizePath(path);

        if (
          normalizedPath.length === 1 && cwd.writeTextFile(path, data, options)
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

    readTextFile(path: string): Promise<string> {
      return new Promise((resolve, reject) => {
        const directoryOrFile = cwd.getChildRec(Directory.normalizePath(path));

        if (directoryOrFile && directoryOrFile instanceof File) {
          resolve(directoryOrFile.content);
        }

        reject(new Error("Cannot read file"));
      });
    },
  };
}
