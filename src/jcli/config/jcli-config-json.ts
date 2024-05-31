import { LevelName } from "log";
import { api } from "@/api/mod.ts";

interface AuthToken {
  token: string;
}

interface Authentications {
  [url: string]: AuthToken;
}

export function jcliConfigDotJSONPath(): string {
  return `${api.fs.homePath()}/.config/jcli/config.json`;
}

export interface JcliConfigDotJSON {
  jetEndpoint: string;
  authentications?: Authentications;
  logLevel?: LevelName;
}
