import { DeployOptions } from "./option.ts";
import { api, PROJECT_DB_PATH } from "@/api/mod.ts";

export default async function (options: DeployOptions) {
  const db = await api.db.connect(PROJECT_DB_PATH);

  try {
    const [[projectId]] = db.query<[string]>("SELECT project_id FROM metadata");

    await api.jet.deploy({
      projectUuid: projectId,
      commitId: options.commit,
    });
  } finally {
    db.close();
  }
}
