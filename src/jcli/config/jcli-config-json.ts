import { LevelName } from "cliffy/log";

export function jcliConfigDotJSONPath(): string {
  const homePath = Deno.env.get("HOME");

  if (homePath) {
    return `${homePath}/.config/jcli/config.json`;
  } else {
    throw new Error("HOME not found");
  }
}

export interface JcliConfigDotJSON {
  jetEndpoint: string;
  logLevel?: LevelName;
}
