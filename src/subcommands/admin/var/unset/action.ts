import { VarOptions } from "@/subcommands/admin/var/option.ts";
import { api, PROJECT_DB_PATH } from "@/api/mod.ts";
import { buildEnvironmentName } from "@/subcommands/admin/var/utilities.ts";

export default async function (options: VarOptions, name: string) {
  const db = await api.db.connect(PROJECT_DB_PATH);

  try {
    const [[projectId]] = db.query<[string]>("SELECT project_id FROM metadata");

    await Promise.allSettled([api.jet.unsetEnvironmentVariable({
      projectId,
      environmentName: buildEnvironmentName(options),
      name,
    })]);
  } finally {
    db.close();
  }
}
