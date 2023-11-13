import {
  afterEach,
  assertEquals,
  beforeEach,
  describe,
  it,
} from "@test/mod.ts";

import { setupAPI } from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "@/subcommands/db/migrate/action.ts";

describe("functions", () => {
  let api: APIClientTest;
  let projectUuid: string;

  const options = {};

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");

    api.chdir("my_proj");

    projectUuid = api.jet.getProject({ projectName: "my_proj" })!.id;
  });

  afterEach(() => {
    api.cleanup();
  });

  it("Call Jet to migrate database", async () => {
    assertEquals(api.jet.getRunMigrationCount(projectUuid), 0);

    await action(options);

    assertEquals(api.jet.getRunMigrationCount(projectUuid), 1);
  });
});
