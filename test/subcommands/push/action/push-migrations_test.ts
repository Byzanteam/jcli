import { assertEquals, assertNotEquals } from "@test/mod.ts";

import { afterEach, beforeEach, describe, it } from "@test/mod.ts";

import { PROJECT_DB_PATH, setupAPI } from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "@/subcommands/push/action.ts";
import { digest } from "@/jcli/crypto.ts";

describe("migrations", () => {
  let api: APIClientTest;
  let projectUuid: string;

  const options = { onlyMigrations: true };

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

  describe("new migrations", () => {
    beforeEach(async () => {
      await api.fs.writeTextFile("migrations/202301010000_a.sql", "0", {
        createNew: true,
      });
      await api.fs.writeTextFile("migrations/202301010001_b.sql", "1", {
        createNew: true,
      });
      await api.fs.writeTextFile("migrations/202301010002_c.sql", "2", {
        createNew: true,
      });

      await action(options);
    });

    it("pushes to jet", () => {
      const migrations = api.jet.getMigrations(projectUuid)!;

      assertEquals(migrations.size, 3);

      assertEquals(migrations.get(202301010000)?.content, "0");
      assertEquals(migrations.get(202301010001)?.content, "1");
      assertEquals(migrations.get(202301010002)?.content, "2");
    });

    it("updates db", async () => {
      const db = await api.db.connect(PROJECT_DB_PATH);
      const entries = db.queryEntries<{ path: string; hash: string }>(
        "SELECT path, hash FROM objects WHERE filetype = 'MIGRATION' ORDER BY path",
      );

      const encoder = new TextEncoder();

      assertEquals(entries.length, 3);
      assertEquals(entries[0].path, "migrations/202301010000_a.sql");
      assertEquals(entries[0].hash, await digest(encoder.encode("0")));
      assertEquals(entries[1].path, "migrations/202301010001_b.sql");
      assertEquals(entries[1].hash, await digest(encoder.encode("1")));
      assertEquals(entries[2].path, "migrations/202301010002_c.sql");
      assertEquals(entries[2].hash, await digest(encoder.encode("2")));

      db.close();
    });
  });

  describe("updated migrations", () => {
    beforeEach(async () => {
      await api.fs.writeTextFile("migrations/202301010000_a.sql", "0", {
        createNew: true,
      });
      await api.fs.writeTextFile("migrations/202301010001_b.sql", "1", {
        createNew: true,
      });
      await action(options);

      await api.fs.writeTextFile("migrations/202301010000_a.sql", "2");
      await action(options);
    });

    it("pushes to jet", () => {
      const migrations = api.jet.getMigrations(projectUuid)!;

      assertEquals(migrations.size, 2);
      assertEquals(migrations.get(202301010000)?.content, "2");
    });

    it("updates db", async () => {
      const db = await api.db.connect(PROJECT_DB_PATH);
      const entries = db.queryEntries<{ hash: string }>(
        "SELECT hash FROM objects WHERE path = :path",
        { path: "migrations/202301010000_a.sql" },
      );

      assertEquals(entries.length, 1);
      assertEquals(
        entries[0].hash,
        await digest(new TextEncoder().encode("2")),
      );

      db.close();
    });
  });

  describe("deleted migrations", () => {
    beforeEach(async () => {
      await api.fs.writeTextFile("migrations/202301010000_a.sql", "0", {
        createNew: true,
      });
      await api.fs.writeTextFile("migrations/202301010001_b.sql", "1", {
        createNew: true,
      });
      await action(options);

      await api.fs.remove("migrations/202301010000_a.sql");
      await action(options);
    });

    it("pushes to jet", () => {
      const migrations = api.jet.getMigrations(projectUuid)!;

      assertEquals(migrations.size, 1);
      assertEquals(migrations.get(202301010000), undefined);
    });

    it("updates db", async () => {
      const db = await api.db.connect(PROJECT_DB_PATH);
      const entries = db.queryEntries<{ path: string; hash: string }>(
        "SELECT path, hash FROM objects WHERE filetype = 'MIGRATION' ORDER BY path",
      );

      assertEquals(entries.length, 1);
      assertNotEquals(entries[0].path, "migrations/202301010000_a.sql");

      db.close();
    });
  });
});
