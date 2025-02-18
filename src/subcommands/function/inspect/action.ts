import { InspectOptions } from "./option.ts";
import {
  api,
  Deployment,
  DeploymentState,
  PROJECT_DB_PATH,
  ProjectEnvironmentName,
} from "@/api/mod.ts";
import { buildEnvironmentName } from "@/subcommands/admin/var/utilities.ts";
import { Table } from "@cliffy/table";
import { colors } from "@cliffy/ansi/colors";

const stateColors: Record<DeploymentState, (text: string) => string> = {
  "UNSPECIFIED": colors.gray,
  "BOOTING": colors.cyan,
  "RUNNING": colors.green,
  "BOOT_FAILED": colors.red,
  "DESTROYED": colors.magenta,
  "EARLY_EXITED": colors.red,
  "UNCAUGHT_EXCEPTION": colors.red,
  "MEMORY_LIMIT_EXCEEDED": colors.red,
};

function coloredDeploymentState(state: DeploymentState): string {
  return stateColors[state](state);
}

function buildDeploymentTable(
  deployment: Deployment,
  functionName: string,
  environmentName: ProjectEnvironmentName,
) {
  return Table.from([
    ["Environment", environmentName],
    ["Function Name", functionName],
    ["Deployment State", coloredDeploymentState(deployment.state)],
    ["Deployment Endpoint", deployment.endpoint ?? "N/A"],
  ]);
}

async function inspectAndBuildTable(
  projectId: string,
  environmentName: ProjectEnvironmentName,
  functionName: string,
): Promise<string | undefined> {
  const deployment = await api.jet.inspectFunction({
    projectId,
    environmentName,
    functionName,
  });

  if (!deployment) {
    api.console.log(`Function ${functionName} not found.`);
    return undefined;
  }

  return buildDeploymentTable(deployment, functionName, environmentName)
    .toString();
}

export default async function (options: InspectOptions, functionName?: string) {
  const db = await api.db.connect(PROJECT_DB_PATH);
  const environmentName = buildEnvironmentName(options);

  try {
    const [[projectId]] = db.query<[string]>("SELECT project_id FROM metadata");
    const functionNames = functionName ? [functionName] : db.query<[string]>(
      `SELECT name FROM functions WHERE name GLOB '[^_]*' ORDER BY name`,
    ).flat();

    const deploymentTables = await Promise.all(
      functionNames.map((name) =>
        inspectAndBuildTable(projectId, environmentName, name)
      ),
    );
    api.console.log(deploymentTables.filter(Boolean).join("\n\n"));
  } finally {
    db.close();
  }
}
