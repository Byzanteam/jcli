import { join } from "path";
import {
  afterEach,
  assertEquals,
  beforeEach,
  describe,
  it,
} from "@test/mod.ts";

import { PROJECT_ASSETS_DIRECTORY, setupAPI } from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import push from "@/subcommands/push/action.ts";
import migrate from "@/subcommands/db/migrate/action.ts";
import action from "@/subcommands/db/rollback/action.ts";

describe("functions", () => {
  let api: APIClientTest;
  let projectId: string;

  const options = {};
  async function writeMigrationFile(
    name: string,
    content: string,
    create: boolean = true,
  ) {
    const file = join(PROJECT_ASSETS_DIRECTORY, "migrations", name);
    await api.fs.writeTextFile(file, content, { createNew: create });
  }

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");

    projectId = api.jet.getProject({ projectName: "my_proj" })!.id;

    api.chdir("my_proj");

    writeMigrationFile("202000000000_a.sql", "a");

    await push({ onlyMigrations: true });
    await migrate({});
  });

  afterEach(() => {
    api.cleanup();
  });

  it("Call Jet to rollback database", async () => {
    let executedMigrations = await api.jet.listMigrations({ projectId });

    assertEquals(executedMigrations.length, 1);
    assertEquals(executedMigrations[0], 202000000000);

    await action(options);

    executedMigrations = await api.jet.listMigrations({ projectId });

    assertEquals(executedMigrations.length, 0);
  });
});
