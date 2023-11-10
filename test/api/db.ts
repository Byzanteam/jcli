import { DB, DBClass } from "@/api/db.ts";
import { join } from "path";

export interface DBTest extends DB {
  chdir(path: string): void;
  cleanup(): void;
  hasDatabase(path: string): boolean;
}

class TestDB extends DBClass {
  #connectionCount = 0;

  countConnection(): void {
    this.#connectionCount++;
  }

  close(_force: boolean) {
    this.#connectionCount--;
  }

  doClose(force = false): void {
    if (this.#connectionCount > 0) {
      throw new Error("Database is not closed.");
    } else {
      super.close(force);
    }
  }
}

export function makeDB(): DBTest {
  const databases = new Map<string, TestDB>();

  let cwd = "";

  return {
    createDatabase(path: string): DBClass {
      const db = new TestDB();
      db.countConnection();
      databases.set(path, db);

      return db;
    },

    connect(path: string): Promise<DBClass> {
      return new Promise((resolve, reject) => {
        const instance = databases.get(join(cwd, path));

        if (instance) {
          instance.countConnection();
          resolve(instance);
        } else {
          reject("No such database.");
        }
      });
    },

    chdir(path: string): void {
      cwd = path;
    },

    cleanup(): void {
      for (const instance of databases.values()) {
        instance.doClose();
      }
    },

    hasDatabase(path: string): boolean {
      return databases.has(join(cwd, path));
    },
  };
}
