import { VarOptions } from "@/subcommands/admin/var/option.ts";
import { api, PROJECT_DB_PATH } from "@/api/mod.ts";
import { buildEnvironmentName } from "@/subcommands/admin/var/utilities.ts";

export default async function (
  options: VarOptions,
  name: string,
  value: string,
) {
  const db = await api.db.connect(PROJECT_DB_PATH);

  try {
    const [[projectId]] = db.prepare("SELECT project_id FROM metadata");

    await api.jet.setEnvironmentVariable({
      projectId,
      environmentName: buildEnvironmentName(options),
      name,
      value,
    });
  } finally {
    db.close();
  }
}
