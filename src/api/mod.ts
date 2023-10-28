import { FS, fs, WriteFileOptions } from "@/api/fs.ts";
import { Jet, makeJet } from "@/api/jet.ts";

import { ConfigBase, ConfigSerializer } from "@/jcli/config/config.ts";
import {
  JcliConfigDotJSON,
  jcliConfigDotJSONPath,
} from "@/jcli/config/jcli-config-json.ts";

class Config<T> extends ConfigBase<T> {
  _fs = fs;
}

export const config = await new Config<JcliConfigDotJSON>(
  jcliConfigDotJSONPath(fs),
).get();

export type { FS, Jet, WriteFileOptions };

export interface APIClient {
  fs: FS;
  jet: Jet;
  Config: new <T>(
    path: string,
    options?: { serializer?: ConfigSerializer<T> },
  ) => ConfigBase<T>;
}

export const api: APIClient = {
  fs,
  jet: makeJet(config),
  Config: Config,
};
