import { DB, db, DBClass } from "@/api/db.ts";
import { DirEntry, FS, fs, WriteFileOptions } from "@/api/fs.ts";
import { Jet, jet } from "@/api/jet.ts";

import { Config } from "@/jcli/config/config.ts";
import {
  JcliConfigDotJSON,
  jcliConfigDotJSONPath,
} from "@/jcli/config/jcli-config-json.ts";

let config: Config<JcliConfigDotJSON>;

export function getConfig(): Config<JcliConfigDotJSON> {
  if (undefined === config) {
    config = new Config<JcliConfigDotJSON>(jcliConfigDotJSONPath());
  }

  return config;
}

export const PROJECT_DB_PATH = ".jcli/project.sqlite";

export type { DB, DBClass, DirEntry, FS, Jet, WriteFileOptions };

export interface APIClient {
  db: DB;
  fs: FS;
  jet: Jet;
}

export const api: APIClient = {
  db,
  fs,
  jet,
};

export function setupAPI(instance: APIClient): void {
  api.db = instance.db;
  api.fs = instance.fs;
  api.jet = instance.jet;
}
