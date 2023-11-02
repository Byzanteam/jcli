import { LevelName } from "log";
import { api } from "@/api/mod.ts";

export function jcliConfigDotJSONPath(): string {
  return `${api.fs.homePath()}/.config/jcli/config.json`;
}

export interface JcliConfigDotJSON {
  jetEndpoint: string;
  logLevel?: LevelName;
}
