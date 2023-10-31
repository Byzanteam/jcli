import { DB as DBClass } from "sqlite";

export { DBClass };

export interface DB {
  createDatabase(path: string): DBClass;
  connect(path: string): Promise<DBClass>;
}

export const db: DB = {
  createDatabase(path: string) {
    return new DBClass(path);
  },

  connect(path: string) {
    return new Promise((resolve) => {
      const db = new DBClass(path, { mode: "write" });
      resolve(db);
    });
  },
};
