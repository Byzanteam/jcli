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
import action from "@/subcommands/db/migrations/action.ts";

describe("functions", () => {
  let api: APIClientTest;

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

    api.chdir("my_proj");

    for (let i = 0; i < 3; i++) {
      writeMigrationFile(`20200000000${i}.sql`, i.toString());
    }

    await push({ include: ["migration"] });

    await migrate({});

    for (let i = 3; i < 5; i++) {
      writeMigrationFile(`20200000000${i}.sql`, i.toString());
    }

    await push({ include: ["migration"] });

    writeMigrationFile(`202000000001.sql`, "111", false);

    writeMigrationFile(`202000000005.sql`, "5");
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
