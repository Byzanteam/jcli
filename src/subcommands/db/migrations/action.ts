import { GlobalOptions } from "@/args.ts";
import { api, DBClass, PROJECT_DB_PATH } from "@/api/mod.ts";

import {
  getMigrationsStatus,
  listMigrationHashesQuery,
} from "@/jcli/file/migrations-man.ts";

async function renderMigrations(
  db: DBClass,
  executedMigrations: Array<number>,
): Promise<void> {
  const statuses = new Map<number, string>();
  const allVersions = new Set<number>(executedMigrations);

  for await (
    const s of getMigrationsStatus(() => listMigrationHashesQuery(db))
  ) {
    const version = await s.entry.version();
    statuses.set(version, s.type);
    allVersions.add(version);
  }

  for (const version of Array.from(allVersions).sort()) {
    api.console.log(formatMessage(version, statuses, executedMigrations));
  }
}

function formatMessage(
  version: number,
  statuses: Map<number, string>,
  executedMigrations: ReadonlyArray<number>,
) {
  const status = statuses.get(version);

  const migrated = executedMigrations.includes(version) ? "" : "not migrated";
  const inLocal = status && status !== "DELETED" ? "" : "not exists in local";
  const inJet = status && status !== "CREATED" ? "" : "not pushed to Jet";
  const hasLocalChanges = status && status === "UPDATED"
    ? "has local changes not pushed to Jet"
    : "";

  const tags = [migrated, inLocal, inJet, hasLocalChanges].filter((e) =>
    "" !== e
  );

  if (0 === tags.length) {
    return version.toString();
  } else {
    return `${version} (${tags.join("; ")})`;
  }
}

export default async function (_options: GlobalOptions): Promise<void> {
  const db = await api.db.connect(PROJECT_DB_PATH);

  try {
    const [[projectId]] = db.query<[string]>("SELECT project_id FROM metadata");
    const executedMigrations = await api.jet.listMigrations({
      projectUuid: projectId,
    });

    await renderMigrations(db, executedMigrations);
  } finally {
    db.close();
  }
}
