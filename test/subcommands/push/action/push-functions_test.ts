import { assert, assertEquals, assertObjectMatch } from "@test/mod.ts";

import { afterEach, beforeEach, describe, it } from "@test/mod.ts";

import { PROJECT_DB_PATH, setupAPI } from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "@/subcommands/push/action.ts";
import { digest } from "@/jcli/crypto.ts";

describe("functions", () => {
  let api: APIClientTest;
  let projectId: string;

  const options = { onlyFunctions: true };

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

  describe("new functions", () => {
    beforeEach(async () => {
      await api.fs.mkdir("functions/my_func");
      await action(options);
    });

    it("pushes to jet", () => {
      const functions = api.jet.getFunctions(projectId)!;

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
      const functions = api.jet.getFunctions(projectId)!;

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
        const func = api.jet.getFunctions(projectId)!.get("my_func")!;

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
        assertEquals(
          entries[0].hash,
          await digest(encoder.encode("/index.tsindex")),
        );
        assertEquals(entries[1].path, `${FUNC_PATH}/posts/entry.ts`);
        assertEquals(
          entries[1].hash,
          await digest(encoder.encode("/posts/entry.tsentry")),
        );
        assertEquals(entries[2].path, `${FUNC_PATH}/users/mod.ts`);
        assertEquals(
          entries[2].hash,
          await digest(encoder.encode("/users/mod.tsmod")),
        );

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
        const func = api.jet.getFunctions(projectId)!.get("my_func")!;

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
        assertEquals(
          entries[0].hash,
          await digest(encoder.encode("/index.tsxedni")),
        );
        assertEquals(entries[1].path, `${FUNC_PATH}/posts/entry.ts`);
        assertEquals(
          entries[1].hash,
          await digest(encoder.encode("/posts/entry.tsyrtne")),
        );
        assertEquals(entries[2].path, `${FUNC_PATH}/users/mod.ts`);
        assertEquals(
          entries[2].hash,
          await digest(encoder.encode("/users/mod.tsdom")),
        );

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
        const func = api.jet.getFunctions(projectId)!.get("my_func")!;

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
