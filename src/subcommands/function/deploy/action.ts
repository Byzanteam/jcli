import { api, PROJECT_DB_PATH } from "@/api/mod.ts";
import { buildEnvironmentName } from "@/subcommands/admin/var/utilities.ts";
import { VarOptions } from "@/subcommands/admin/var/option.ts";

export default async function (options: VarOptions) {
  const db = await api.db.connect(PROJECT_DB_PATH);

  try {
    const [[projectId]] = db.query<[string]>("SELECT project_id FROM metadata");

    await api.jet.deployFunctions({
      projectId,
      environmentName: buildEnvironmentName(options),
    });
  } finally {
    db.close();
  }
}
