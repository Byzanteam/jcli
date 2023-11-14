import { GlobalOptions } from "@/args.ts";
import { api, PROJECT_DB_PATH } from "@/api/mod.ts";

export default async function (_options: GlobalOptions): Promise<void> {
  const db = await api.db.connect(PROJECT_DB_PATH);

  try {
    const [[projectId]] = db.query<[string]>("SELECT project_id FROM metadata");
    const executedMigrations = await api.jet.listMigrations({
      projectUuid: projectId,
    });

    for (const version of executedMigrations) {
      api.console.log(`${version}`);
    }
  } finally {
    db.close();
  }
}
