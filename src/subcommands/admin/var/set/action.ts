import { GlobalOptions } from "@/args.ts";
import { api, PROJECT_DB_PATH } from "@/api/mod.ts";

export default async function (
  _options: GlobalOptions,
  name: string,
  value: string,
) {
  const db = await api.db.connect(PROJECT_DB_PATH);

  try {
    const [[projectId]] = db.query<[string]>("SELECT project_id FROM metadata");

    await api.jet.setEnvironmentVariable({
      projectId,
      environmentName: "DEVELOPMENT",
      name,
      value,
    });
  } finally {
    db.close();
  }
}
