import { VarOptions } from "@/subcommands/admin/var/option.ts";
import { api, PROJECT_DB_PATH } from "@/api/mod.ts";
import { buildEnvironmentName } from "@/subcommands/admin/var/utilities.ts";

function renderEnvironmentVariables(
  variables: ReadonlyArray<{ name: string; value: string }>,
): void {
  for (const { name, value } of variables) {
    api.console.log(`${name}=${value}`);
  }
}

export default async function (options: VarOptions) {
  const db = await api.db.connect(PROJECT_DB_PATH);

  try {
    const [[projectId]] = db.query<[string]>("SELECT project_id FROM metadata");

    const vars = await api.jet.listEnvironmentVariables({
      projectId,
      environmentName: buildEnvironmentName(options),
    });

    renderEnvironmentVariables(vars);
  } finally {
    db.close();
  }
}
