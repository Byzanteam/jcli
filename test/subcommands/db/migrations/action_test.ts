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

    for (let i = 0; i < 3; i++) {
      api.fs.writeTextFile(`migrations/20200000000${i}.sql`, i.toString(), {
        createNew: true,
      });
    }

    await push({ onlyMigrations: true });

    await migrate({});

    for (let i = 3; i < 5; i++) {
      api.fs.writeTextFile(`migrations/20200000000${i}.sql`, i.toString(), {
        createNew: true,
      });
    }

    await push({ onlyMigrations: true });

    api.fs.writeTextFile(`migrations/202000000001.sql`, "111");

    api.fs.writeTextFile(`migrations/202000000005.sql`, "5", {
      createNew: true,
    });
  });

  afterEach(() => {
    api.cleanup();
  });

  it("Call Jet to migrate database", async () => {
    api.console.configure({ capture: true });

    await action(options);

    assertEquals(api.console.logs.length, 6);
    assertEquals(api.console.logs[0], "202000000000");
    assertEquals(
      api.console.logs[1],
      "202000000001 (has local changes not pushed to Jet)",
    );
    assertEquals(api.console.logs[2], "202000000002");
    assertEquals(api.console.logs[3], "202000000003 (not migrated)");
    assertEquals(api.console.logs[4], "202000000004 (not migrated)");
    assertEquals(
      api.console.logs[5],
      "202000000005 (not migrated; not pushed to Jet)",
    );
  });
});
