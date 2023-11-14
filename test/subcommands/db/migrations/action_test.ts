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
import push from "@/subcommands/push/action.ts";
import migrate from "@/subcommands/db/migrate/action.ts";
import action from "@/subcommands/db/migrations/action.ts";

describe("functions", () => {
  let api: APIClientTest;

  const options = {};

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");

    api.chdir("my_proj");

    api.fs.writeTextFile("migrations/202000000000_a.sql", "a", {
      createNew: true,
    });

    api.fs.writeTextFile("migrations/202000000001_b.sql", "b", {
      createNew: true,
    });

    await push({ onlyMigrations: true });

    await migrate({});
  });

  afterEach(() => {
    api.cleanup();
  });

  it("Call Jet to migrate database", async () => {
    api.console.configure({ capture: true });

    await action(options);

    assertEquals(api.console.logs.length, 2);
    assertEquals(api.console.logs[0], "202000000000");
    assertEquals(api.console.logs[1], "202000000001");
  });
});
