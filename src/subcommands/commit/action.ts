import { CommitOptions } from "./option.ts";
import { api, PROJECT_DB_PATH } from "@/api/mod.ts";
import { digestProject } from "@/jcli/file/project.ts";

export default async function (options: CommitOptions) {
  const db = await api.db.connect(PROJECT_DB_PATH);

  try {
    const [[projectId]] = db.query<[string]>("SELECT project_id FROM metadata");

    await api.jet.commit({
      projectId,
      message: options.message,
      hash: await digestProject(db),
    });
  } finally {
    db.close();
  }
}
