import { api, PROJECT_DB_PATH } from "@/api/mod.ts";
import { buildEnvironmentName } from "@/subcommands/admin/var/utilities.ts";
import { VarOptions } from "@/subcommands/plugin/options.ts";

export default async function (options: VarOptions, instanceName: string) {
  const db = await api.db.connect(PROJECT_DB_PATH);

  try {
    const [[projectId]] = db.prepare("SELECT project_id FROM metadata");

    await api.jet.pluginUninstallInstance({
      projectId,
      instanceName,
      environmentName: buildEnvironmentName(options),
    });
  } finally {
    db.close();
  }
}
