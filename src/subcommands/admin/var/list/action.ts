import { GlobalOptions } from "@/args.ts";
import { api, PROJECT_DB_PATH } from "@/api/mod.ts";

function renderEnvironmentVariables(
  variables: ReadonlyArray<{ name: string; value: string }>,
): void {
  for (const { name, value } of variables) {
    api.console.log(`${name}=${value}`);
  }
}

export default async function (_options: GlobalOptions) {
  const db = await api.db.connect(PROJECT_DB_PATH);

  try {
    const [[projectId]] = db.query<[string]>("SELECT project_id FROM metadata");

    const vars = await api.jet.listEnvironmentVariables({
      projectId,
      environmentName: "DEVELOPMENT",
    });

    renderEnvironmentVariables(vars);
  } finally {
    db.close();
  }
}
