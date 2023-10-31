import { DB, DBClass } from "@/api/db.ts";
import { dirname, join } from "path";

export { DBClass };

export interface DBTest extends DB {
  cleanup(): void;
  hasDatabase(path: string): boolean;
}

export function makeDB(): DBTest {
  const namespaceDir = join("test/tmp", crypto.randomUUID());
  const databases = new Set<string>();

  let hasDir = false;

  const buildPath = (path: string): string => {
    if (!hasDir) {
      const databaseDir = join(namespaceDir, dirname(path));
      Deno.mkdirSync(databaseDir, { recursive: true });
      hasDir = true;
    }

    return join(namespaceDir, path);
  };

  return {
    createDatabase(path: string): DBClass {
      const db = new DBClass(buildPath(path));
      databases.add(path);
      return db;
    },

    connect(path: string): Promise<DBClass> {
      return new Promise((resolve) => {
        const db = new DBClass(buildPath(path), { mode: "write" });
        resolve(db);
      });
    },

    cleanup(): void {
      if (hasDir) {
        Deno.removeSync(namespaceDir, { recursive: true });
      }
    },

    hasDatabase(path: string): boolean {
      return databases.has(path);
    },
  };
}
