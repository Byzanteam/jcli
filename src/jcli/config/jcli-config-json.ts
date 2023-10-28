import { LevelName } from "cliffy/log";
import { FS } from "@/api/mod.ts";

export function jcliConfigDotJSONPath(fs: FS): string {
  return `${fs.homePath()}/.config/jcli/config.json`;
}

export interface JcliConfigDotJSON {
  jetEndpoint: string;
  logLevel?: LevelName;
}
