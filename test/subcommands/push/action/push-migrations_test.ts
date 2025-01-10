import { join } from "path";

import { assertEquals, assertNotEquals } from "@test/mod.ts";
import { afterEach, beforeEach, describe, it } from "@test/mod.ts";

import {
  PROJECT_ASSETS_DIRECTORY,
  PROJECT_DB_PATH,
  setupAPI,
} from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "@/subcommands/push/action.ts";
import { digest } from "@/jcli/crypto.ts";

describe("migrations", () => {
  let api: APIClientTest;
  let projectId: string;

  const options = { onlyMigrations: true };

  async function writeMigrationFile(
    name: string,
    content: string,
    create: boolean = false,
  ) {
    const file = join(PROJECT_ASSETS_DIRECTORY, "migrations", name);
    await api.fs.writeTextFile(file, content, { createNew: create });
  }
  async function removeMigrationFile(name: string) {
    const file = join(PROJECT_ASSETS_DIRECTORY, "migrations", name);
    await api.fs.remove(file);
  }

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");

    api.chdir("my_proj");

    projectId = api.jet.getProject({ projectName: "my_proj" })!.id;
  });

  afterEach(() => {
    api.cleanup();
  });

  describe("new migrations", () => {
    beforeEach(async () => {
      await writeMigrationFile("202301010000_a.sql", "0", true);
      await writeMigrationFile("202301010001_b.sql", "1", true);
      await writeMigrationFile("202301010002_c.sql", "2", true);

      await action(options);
    });

    it("pushes to jet", () => {
      const migrations = api.jet.getMigrations(projectId)!;

      assertEquals(migrations.size, 3);

      assertEquals(migrations.get(202301010000)?.content, "0");
      assertEquals(migrations.get(202301010000)?.name, "a");
      assertEquals(migrations.get(202301010001)?.content, "1");
      assertEquals(migrations.get(202301010001)?.name, "b");
      assertEquals(migrations.get(202301010002)?.content, "2");
      assertEquals(migrations.get(202301010002)?.name, "c");
    });

    it("updates db", async () => {
      const db = await api.db.connect(PROJECT_DB_PATH);
      const entries = db.queryEntries<{ path: string; hash: string }>(
        "SELECT path, hash FROM objects WHERE filetype = 'MIGRATION' ORDER BY path",
      );

      const encoder = new TextEncoder();

      assertEquals(entries.length, 3);
      assertEquals(entries[0].path, "migrations/202301010000_a.sql");
      assertEquals(
        entries[0].hash,
        await digest(encoder.encode("202301010000a0")),
      );
      assertEquals(entries[1].path, "migrations/202301010001_b.sql");
      assertEquals(
        entries[1].hash,
        await digest(encoder.encode("202301010001b1")),
      );
      assertEquals(entries[2].path, "migrations/202301010002_c.sql");
      assertEquals(
        entries[2].hash,
        await digest(encoder.encode("202301010002c2")),
      );

      db.close();
    });
  });

  describe("updated migrations", () => {
    beforeEach(async () => {
      await writeMigrationFile("202301010000_a.sql", "0", true);
      await writeMigrationFile("202301010001_b.sql", "1", true);
      await writeMigrationFile("202301010002.sql", "2", true);

      await action(options);

      await writeMigrationFile("202301010000_a.sql", "2");
      await writeMigrationFile("202301010001.sql", "1", true);
      await removeMigrationFile("202301010001_b.sql");
      await writeMigrationFile("202301010002_c.sql", "2", true);
      await removeMigrationFile("202301010002.sql");

      await action(options);
    });

    it("pushes to jet", () => {
      const migrations = api.jet.getMigrations(projectId)!;

      assertEquals(migrations.size, 3);
      assertEquals(migrations.get(202301010000)?.content, "2");
      assertEquals(migrations.get(202301010000)?.name, "a");
      assertEquals(migrations.get(202301010001)?.content, "1");
      assertEquals(migrations.get(202301010001)?.name, null);
      assertEquals(migrations.get(202301010002)?.content, "2");
      assertEquals(migrations.get(202301010002)?.name, "c");
    });

    it("updates db", async () => {
      const db = await api.db.connect(PROJECT_DB_PATH);

      const entries = db.queryEntries<{ path: string; hash: string }>(
        "SELECT path, hash FROM objects WHERE filetype = 'MIGRATION' ORDER BY path",
      );

      assertEquals(entries.length, 3);
      assertEquals(entries[0].path, "migrations/202301010000_a.sql");
      assertEquals(
        entries[0].hash,
        await digest(new TextEncoder().encode("202301010000a2")),
      );

      assertEquals(entries[1].path, "migrations/202301010001.sql");
      assertEquals(
        entries[1].hash,
        await digest(new TextEncoder().encode("2023010100011")),
      );

      assertEquals(entries[2].path, "migrations/202301010002_c.sql");
      assertEquals(
        entries[2].hash,
        await digest(new TextEncoder().encode("202301010002c2")),
      );

      db.close();
    });
  });

  describe("deleted migrations", () => {
    beforeEach(async () => {
      await writeMigrationFile("202301010000_a.sql", "0", true);
      await writeMigrationFile("202301010001_b.sql", "1", true);

      await action(options);

      await removeMigrationFile("202301010000_a.sql");
      await action(options);
    });

    it("pushes to jet", () => {
      const migrations = api.jet.getMigrations(projectId)!;

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
