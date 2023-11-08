import {
  assert,
  assertEquals,
  assertNotEquals,
  assertObjectMatch,
  assertRejects,
} from "@test/mod.ts";

import { afterEach, beforeEach, describe, it } from "@test/mod.ts";

import { PROJECT_DB_PATH, setupAPI } from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "@/subcommands/push/action.ts";
import { digest } from "@/jcli/crypto.ts";

describe("configuration", () => {
  let api: APIClientTest;
  let projectUuid: string;

  const options = { onlyConfiguration: true };

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

  describe("works", () => {
    const newConfiguration = {
      name: "name",
      title: "title",
      capabilities: [
        {
          name: "capability1",
          payload: { __type__: "database", schema: "schema" },
        },
      ],
      instances: [
        {
          pluginName: "plugin",
          name: "instance",
          description: "description",
          config: { token: "token" },
          capabilityNames: ["capability1"],
        },
      ],
    };

    beforeEach(async () => {
      await api.fs.writeTextFile(
        "project.json",
        JSON.stringify(newConfiguration),
      );

      await action(options);
    });

    it("pushes to jet", () => {
      const patches = api.jet.getConfigurationPatches(projectUuid);

      assertNotEquals(patches, undefined);
      assertEquals(patches!.length, 1);

      assertObjectMatch(patches![0], {
        name: "name",
        title: "title",
        capabilities: [
          {
            action: "CREATE",
            name: "capability1",
            payload: { __type__: "database", schema: "schema" },
          },
        ],
        instances: [
          {
            action: "CREATE",
            pluginName: "plugin",
            name: "instance",
            description: "description",
            config: { token: "token" },
            capabilityNames: ["capability1"],
          },
        ],
      });
    });

    it("updates db", async () => {
      const db = await api.db.connect(PROJECT_DB_PATH);
      const entries = db.queryEntries<{ data: string }>(
        "SELECT data FROM configuration",
      );

      assertEquals(entries.length, 1);

      const config = JSON.parse(entries[0].data);

      assertObjectMatch(config, newConfiguration);

      db.close();
    });
  });

  describe("fails", () => {
    const invalidConfiguration = {
      name: "name",
      title: "title",
      capabilities: [
        {
          name: "capability1",
          payload: { __type__: "invalid", schema: "schema" },
        },
      ],
      instances: [
        {
          name: "instance",
          description: "description",
          config: { token: "token" },
          capabilityNames: ["capability1"],
        },
      ],
    };

    beforeEach(async () => {
      await api.fs.writeTextFile(
        "project.json",
        JSON.stringify(invalidConfiguration),
      );
    });

    it("rejects invalid configuration", async () => {
      await assertRejects(async () => {
        await action(options);
      }, "Invalid configuration");

      const patches = api.jet.getConfigurationPatches(projectUuid);

      assertEquals(patches!.length, 0);

      const db = await api.db.connect(PROJECT_DB_PATH);
      const entries = db.queryEntries<{ data: string }>(
        "SELECT data FROM configuration",
      );

      const config = JSON.parse(entries[0].data);

      assertObjectMatch(config, {
        name: "my_proj",
        title: "my_proj",
        capabilities: [],
        instances: [],
      });

      db.close();
    });
  });
});

describe("functions", () => {
  let api: APIClientTest;
  let projectUuid: string;

  const options = { onlyFunctions: true };

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

  describe("new functions", () => {
    beforeEach(async () => {
      await api.fs.mkdir("functions/my_func");
      await action(options);
    });

    it("pushes to jet", () => {
      const functions = api.jet.getFunctions(projectUuid)!;

      assertEquals(functions.size, 1);

      assertEquals(functions.get("my_func")?.name, "my_func");
      assertEquals(functions.get("my_func")?.title, "my_func");
    });

    it("updates db", async () => {
      const db = await api.db.connect(PROJECT_DB_PATH);
      const entries = db.queryEntries<{ name: string }>(
        "SELECT name FROM functions",
      );

      assertEquals(entries.length, 1);
      assertObjectMatch(entries[0], { name: "my_func" });

      db.close();
    });
  });

  describe("deleted functions", () => {
    beforeEach(async () => {
      await api.fs.mkdir("functions/my_func1");
      await api.fs.mkdir("functions/my_func2");

      await action(options);

      await api.fs.remove("functions/my_func1");

      await action(options);
    });

    it("pushes to jet", () => {
      const functions = api.jet.getFunctions(projectUuid)!;

      assertEquals(functions.size, 1);
      assertEquals(functions.get("my_func1"), undefined);
    });

    it("updates db", async () => {
      const db = await api.db.connect(PROJECT_DB_PATH);
      const entries = db.queryEntries<{ name: string }>(
        "SELECT name FROM functions",
      );

      assertEquals(entries.length, 1);
      assertObjectMatch(entries[0], { name: "my_func2" });

      db.close();
    });
  });

  describe("files", () => {
    const FUNC_PATH = "functions/my_func";
    const writeFuncFile = async (path: string, content: string) => {
      const fullPath = `${FUNC_PATH}/${path}`;

      if (api.fs.hasFile(fullPath)) {
        await api.fs.writeTextFile(fullPath, content);
      } else {
        await api.fs.writeTextFile(fullPath, content, {
          createNew: true,
        });
      }
    };

    beforeEach(async () => {
      await api.fs.mkdir(FUNC_PATH);
    });

    describe("new files", () => {
      beforeEach(async () => {
        await api.fs.mkdir(`${FUNC_PATH}/users`);
        await api.fs.mkdir(`${FUNC_PATH}/posts`);
        await writeFuncFile("index.ts", "index");
        await writeFuncFile("users/mod.ts", "mod");
        await writeFuncFile("posts/entry.ts", "entry");

        await action(options);
      });

      it("pushes to jet", async () => {
        const func = api.jet.getFunctions(projectUuid)!.get("my_func")!;

        assert(func.files.hasFile(`index.ts`));
        assertEquals(
          await func.files.readTextFile(`index.ts`),
          "index",
        );

        assert(func.files.hasFile(`users/mod.ts`));
        assertEquals(
          await func.files.readTextFile(`/users/mod.ts`),
          "mod",
        );

        assert(func.files.hasFile(`posts/entry.ts`));
        assertEquals(
          await func.files.readTextFile(`posts/entry.ts`),
          "entry",
        );
      });

      it("updates db", async () => {
        const db = await api.db.connect(PROJECT_DB_PATH);
        const entries = db.queryEntries<{ path: string; hash: string }>(
          "SELECT path, hash FROM objects WHERE filetype = 'FUNCTION' ORDER BY path",
        );

        const encoder = new TextEncoder();

        assertEquals(entries.length, 3);
        assertEquals(entries[0].path, `${FUNC_PATH}/index.ts`);
        assertEquals(entries[0].hash, await digest(encoder.encode("index")));
        assertEquals(entries[1].path, `${FUNC_PATH}/posts/entry.ts`);
        assertEquals(entries[1].hash, await digest(encoder.encode("entry")));
        assertEquals(entries[2].path, `${FUNC_PATH}/users/mod.ts`);
        assertEquals(entries[2].hash, await digest(encoder.encode("mod")));

        db.close();
      });
    });

    describe("updated files", () => {
      beforeEach(async () => {
        await api.fs.mkdir(`${FUNC_PATH}/users`);
        await api.fs.mkdir(`${FUNC_PATH}/posts`);
        await writeFuncFile("index.ts", "index");
        await writeFuncFile("users/mod.ts", "mod");
        await writeFuncFile("posts/entry.ts", "entry");

        await action(options);

        await writeFuncFile("index.ts", "xedni");
        await writeFuncFile("users/mod.ts", "dom");
        await writeFuncFile("posts/entry.ts", "yrtne");

        await action(options);
      });

      it("pushes to jet", async () => {
        const func = api.jet.getFunctions(projectUuid)!.get("my_func")!;

        assert(func.files.hasFile(`index.ts`));
        assertEquals(
          await func.files.readTextFile(`index.ts`),
          "xedni",
        );

        assert(func.files.hasFile(`users/mod.ts`));
        assertEquals(
          await func.files.readTextFile(`users/mod.ts`),
          "dom",
        );

        assert(func.files.hasFile(`posts/entry.ts`));
        assertEquals(
          await func.files.readTextFile(`posts/entry.ts`),
          "yrtne",
        );
      });

      it("updates db", async () => {
        const db = await api.db.connect(PROJECT_DB_PATH);
        const entries = db.queryEntries<{ path: string; hash: string }>(
          "SELECT path, hash FROM objects WHERE filetype = 'FUNCTION' ORDER BY path",
        );

        const encoder = new TextEncoder();

        assertEquals(entries.length, 3);
        assertEquals(entries[0].path, `${FUNC_PATH}/index.ts`);
        assertEquals(entries[0].hash, await digest(encoder.encode("xedni")));
        assertEquals(entries[1].path, `${FUNC_PATH}/posts/entry.ts`);
        assertEquals(entries[1].hash, await digest(encoder.encode("yrtne")));
        assertEquals(entries[2].path, `${FUNC_PATH}/users/mod.ts`);
        assertEquals(entries[2].hash, await digest(encoder.encode("dom")));

        db.close();
      });
    });

    describe("deleted files", () => {
      beforeEach(async () => {
        await api.fs.mkdir(`${FUNC_PATH}/users`);
        await api.fs.mkdir(`${FUNC_PATH}/posts`);
        await writeFuncFile("index.ts", "index");
        await writeFuncFile("users/mod.ts", "mod");
        await writeFuncFile("posts/entry.ts", "entry");

        await action(options);

        await api.fs.remove(`${FUNC_PATH}/users/mod.ts`);

        await action(options);
      });

      it("pushes to jet", () => {
        const func = api.jet.getFunctions(projectUuid)!.get("my_func")!;

        assert(!func.files.hasFile(`${FUNC_PATH}/users/mod.ts`));
      });

      it("updates db", async () => {
        const db = await api.db.connect(PROJECT_DB_PATH);
        const entries = db.queryEntries<{ path: string; hash: string }>(
          "SELECT path, hash FROM objects WHERE filetype = 'FUNCTION' ORDER BY path",
        );

        assertEquals(entries.length, 2);
        assert(entries.every((e) => e.path !== `${FUNC_PATH}/users/mod.ts`));

        db.close();
      });
    });
  });
});

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
