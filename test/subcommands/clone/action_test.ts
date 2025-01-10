import { join } from "path";
import {
  afterEach,
  assert,
  assertEquals,
  assertObjectMatch,
  beforeEach,
  describe,
  it,
} from "@test/mod.ts";

import {
  PROJECT_ASSETS_DIRECTORY,
  PROJECT_DB_PATH,
  setupAPI,
} from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import push from "@/subcommands/push/action.ts";
import action from "@/subcommands/clone/action.ts";

describe("clone", () => {
  let api: APIClientTest;
  let projectId: string;

  const options = {};
  const FUNCTION_PATH = "functions/my_func";

  function writeFuncFile(path: string, content: string) {
    const file = join(PROJECT_ASSETS_DIRECTORY, FUNCTION_PATH, path);

    if (api.fs.hasFile(file)) {
      return api.fs.writeTextFile(file, content);
    } else {
      return api.fs.writeTextFile(file, content, { createNew: true });
    }
  }

  function writeMigrationFile(path: string, code: string) {
    const file = join(PROJECT_ASSETS_DIRECTORY, path);
    api.fs.writeTextFile(file, code, { createNew: true });
  }

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");

    projectId = api.jet.getProject({ projectName: "my_proj" })!.id;

    api.chdir("my_proj");

    ["a", "b", "c"].forEach((name, i) => {
      writeMigrationFile(`migrations/00000000000${i}_${name}.sql`, name);
    });

    await api.fs.mkdir(join(PROJECT_ASSETS_DIRECTORY, FUNCTION_PATH));
    await api.fs.mkdir(join(PROJECT_ASSETS_DIRECTORY, FUNCTION_PATH, "users"));
    await api.fs.mkdir(join(PROJECT_ASSETS_DIRECTORY, FUNCTION_PATH, "posts"));

    await writeFuncFile("index.ts", "index");
    await writeFuncFile("users/mod.ts", "mod");
    await writeFuncFile("posts/entry.ts", "entry");

    await push({});

    api.fs.mkdir(".tmp");
    api.chdir(".tmp");
  });

  afterEach(() => {
    api.cleanup();
  });

  it("creates project directories", async () => {
    assert(!api.fs.hasDir("my_proj"));

    await action(options, projectId);

    assert(api.fs.hasDir("my_proj"));
    assert(api.fs.hasDir("my_proj/.jcli"));
    assert(api.fs.hasDir("my_proj/.jcli/functions"));
    assert(api.fs.hasDir("my_proj/.jcli/migrations"));
  });

  it("creates project directory with specified directory", async () => {
    assert(!api.fs.hasDir("specified"));

    await action(options, projectId, "speicified");

    assert(api.fs.hasDir("speicified"));
    assert(api.fs.hasDir("speicified/.jcli"));
    assert(api.fs.hasDir("speicified/.jcli/functions"));
    assert(api.fs.hasDir("speicified/.jcli/migrations"));
  });

  it("clones my_proj/project.json", async () => {
    await action(options, projectId);

    const configuration = JSON.parse(
      await api.fs.readTextFile("my_proj/project.json"),
    ) as Record<"name" | "title" | "capabilities" | "instances", unknown>;

    assertObjectMatch(configuration, {
      name: "my_proj",
      title: "my_proj",
      capabilities: [],
      instances: [],
    });
  });

  it("provisions metadata.db", async () => {
    await action(options, projectId);

    const expectedDatabase = `my_proj/${PROJECT_DB_PATH}`;

    assert(api.db.hasDatabase(expectedDatabase));

    const database = await api.db.connect(expectedDatabase);

    const columns = database.queryEntries<
      { name: string; type: string; notnull: number; pk: number }
    >(
      `SELECT name, type, "notnull", pk FROM pragma_table_info(:tableName) ORDER BY name`,
      { tableName: "metadata" },
    );

    assertEquals(columns.length, 1);

    assertObjectMatch(columns[0], {
      name: "project_id",
      type: "TEXT",
      notnull: 1,
      pk: 0,
    });

    const metadata = database.query<[string]>(
      "SELECT project_id FROM metadata",
    );

    assertEquals(metadata.length, 1);

    const project = api.jet.getProject({
      projectName: "my_proj",
    })!;

    assertEquals(metadata[0][0], project.id);

    database.close();
  });

  it("provisions configuration.db", async () => {
    await action(options, projectId);

    const expectedDatabase = `my_proj/${PROJECT_DB_PATH}`;

    assert(api.db.hasDatabase(expectedDatabase));

    const database = await api.db.connect(expectedDatabase);

    const columns = database.queryEntries<
      { name: string; type: string; notnull: number; pk: number }
    >(
      `SELECT name, type, "notnull", pk FROM pragma_table_info(:tableName) ORDER BY name`,
      { tableName: "configuration" },
    );

    assertEquals(columns.length, 1);

    assertObjectMatch(columns[0], {
      name: "data",
      type: "TEXT",
      notnull: 1,
      pk: 0,
    });

    const data = database.query<[string]>("SELECT data FROM configuration");

    assertEquals(data.length, 1);

    assertObjectMatch(JSON.parse(data[0][0]), {
      name: "my_proj",
      title: "my_proj",
      capabilities: [],
      instances: [],
    });

    database.close();
  });

  it.only("clones functions", async () => {
    await action(options, projectId);

    // api.fs.inspect();

    assert(api.fs.hasFile(`my_proj/.jcli/${FUNCTION_PATH}/index.ts`));
    // assert(api.fs.hasFile(`my_proj/.jcli/${FUNCTION_PATH}/posts/entry.ts`));
    // assert(api.fs.hasFile(`my_proj/.jcli/${FUNCTION_PATH}/users/mod.ts`));
    //
    // const expectedDatabase = `my_proj/${PROJECT_DB_PATH}`;
    //
    // assert(api.db.hasDatabase(expectedDatabase));
    //
    // const db = await api.db.connect(expectedDatabase);
    //
    // const columns = db.queryEntries<
    //   { name: string; type: string; notnull: number; pk: number }
    // >(
    //   `SELECT name, type, "notnull", pk FROM pragma_table_info(:tableName) ORDER BY name`,
    //   { tableName: "functions" },
    // );
    //
    // assertEquals(columns.length, 1);
    //
    // assertObjectMatch(columns[0], {
    //   name: "name",
    //   type: "TEXT",
    //   notnull: 0,
    //   pk: 1,
    // });
    //
    // const funcEntries = db.queryEntries<{ name: string }>(
    //   "SELECT name FROM functions",
    // );
    //
    // assertEquals(funcEntries.length, 1);
    // assertObjectMatch(funcEntries[0], { name: "my_func" });
    //
    // const fileEntries = db.queryEntries<{ path: string; hash: string }>(
    //   "SELECT path, hash FROM objects WHERE filetype = 'FUNCTION' ORDER BY path",
    // );
    //
    // assertEquals(fileEntries.length, 3);
    // assertEquals(fileEntries[0].path, `${FUNCTION_PATH}/index.ts`);
    // assertEquals(fileEntries[0].hash, "index.ts");
    // assertEquals(fileEntries[1].path, `${FUNCTION_PATH}/posts/entry.ts`);
    // assertEquals(fileEntries[1].hash, "posts/entry.ts");
    // assertEquals(fileEntries[2].path, `${FUNCTION_PATH}/users/mod.ts`);
    // assertEquals(fileEntries[2].hash, "users/mod.ts");
    //
    // db.close();
  });

  it("clones migrations", async () => {
    await action(options, projectId);

    assert(api.fs.hasFile("my_proj/migrations/000000000000_a.sql"));
    assertEquals(
      await api.fs.readTextFile("my_proj/migrations/000000000000_a.sql"),
      "a",
    );
    assert(api.fs.hasFile("my_proj/migrations/000000000001_b.sql"));
    assertEquals(
      await api.fs.readTextFile("my_proj/migrations/000000000001_b.sql"),
      "b",
    );
    assert(api.fs.hasFile("my_proj/migrations/000000000002_c.sql"));
    assertEquals(
      await api.fs.readTextFile("my_proj/migrations/000000000002_c.sql"),
      "c",
    );

    const expectedDatabase = `my_proj/${PROJECT_DB_PATH}`;

    assert(api.db.hasDatabase(expectedDatabase));

    const db = await api.db.connect(expectedDatabase);

    const entries = db.queryEntries<{ path: string; hash: string }>(
      "SELECT path, hash FROM objects WHERE filetype = 'MIGRATION' ORDER BY path",
    );

    assertEquals(entries.length, 3);
    assertEquals(entries[0].path, "migrations/000000000000_a.sql");
    assertEquals(entries[0].hash, "0");
    assertEquals(entries[1].path, "migrations/000000000001_b.sql");
    assertEquals(entries[1].hash, "1");
    assertEquals(entries[2].path, "migrations/000000000002_c.sql");
    assertEquals(entries[2].hash, "2");

    db.close();
  });
});
