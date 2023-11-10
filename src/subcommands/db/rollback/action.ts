import { GlobalOptions } from "@/args.ts";
import { api } from "@/api/mod.ts";

import { Config } from "@/jcli/config/config.ts";
import {
  MetadataDotJSON,
  metadataDotJSONPath,
} from "@/jcli/config/metadata-json.ts";

export default async function (_options: GlobalOptions) {
  const config = new Config<MetadataDotJSON>(metadataDotJSONPath());
  const { projectId } = await config.get();

  await api.jet.rollbackDB({ projectUuid: projectId });
}
