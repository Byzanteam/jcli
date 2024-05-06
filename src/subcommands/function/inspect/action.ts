import { InspectOptions } from "./option.ts";
import { api, PROJECT_DB_PATH } from "@/api/mod.ts";
import { buildEnvironmentName } from "@/subcommands/admin/var/utilities.ts";
import { Table } from "@cliffy/table";

export default async function (options: InspectOptions, functionName: string) {
  const db = await api.db.connect(PROJECT_DB_PATH);

  try {
    const [[projectId]] = db.query<[string]>("SELECT project_id FROM metadata");
    const environmentName = buildEnvironmentName(options);

    const deployment = await api.jet.inspectFunction({
      projectId,
      environmentName,
      functionName,
    });

    if (deployment) {
      const info: Table = new Table(
        ["Environment", environmentName],
        ["Function Name", functionName],
        ["Deployment State", deployment.state],
        ["Deployment Endpoint", deployment.endpoint ?? "N/A"],
      );

      api.console.log(info.toString());
    } else {
      api.console.log(`Function ${functionName} not found.`);
    }
  } finally {
    db.close();
  }
}
