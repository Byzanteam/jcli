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
import action from "@/subcommands/db/migrate/action.ts";

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

    await push({ include: ["migration"] });
  });

  afterEach(() => {
    api.cleanup();
  });

  it("Call Jet to migrate database", async () => {
    let executedMigrations = await api.jet.listMigrations({ projectId });

    assertEquals(executedMigrations.length, 0);

    await action(options);

    executedMigrations = await api.jet.listMigrations({ projectId });

    assertEquals(executedMigrations.length, 1);
    assertEquals(executedMigrations[0], 202000000000);
  });
});
