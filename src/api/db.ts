// import { DB as DBClass } from "sqlite";

import { Database as DBClass } from "jsr:@db/sqlite@0.11";

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
      const db = new DBClass(path);
      resolve(db);
    });
  },
};
