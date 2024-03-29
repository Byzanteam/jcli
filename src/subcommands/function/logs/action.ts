import { LogsOptions } from "./option.ts";
import { api, DeploymentLog, PROJECT_DB_PATH } from "@/api/mod.ts";
import { buildEnvironmentName } from "@/subcommands/admin/var/utilities.ts";

const DEFAULT_LENGTH = 10;

export default async function (options: LogsOptions, functionName?: string) {
  const db = await api.db.connect(PROJECT_DB_PATH);

  try {
    const [[projectId]] = db.query<[string]>("SELECT project_id FROM metadata");

    const logs = await api.jet.listDeploymentLogs({
      projectId,
      environmentName: buildEnvironmentName(options),
      functionName,
      length: options.length ?? DEFAULT_LENGTH,
    });

    for await (const log of logs) {
      api.console.log(formatLog(log));
    }
  } finally {
    db.close();
  }
}

function formatLog(log: DeploymentLog): string {
  const { functionName, message, severity, stacktrace, timestamp } = log;

  const value = `${functionName} ${timestamp} ${severity} ${
    message.replace(/\s+$/, "")
  }`;

  return stacktrace ? `${value}\n${stacktrace}` : value;
}
