import {
  afterEach,
  assert,
  assertEquals,
  assertObjectMatch,
  beforeEach,
  describe,
  it,
} from "@test/mod.ts";

import { PROJECT_DB_PATH } from "@/api/mod.ts";

import { setupAPI } from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import push from "@/subcommands/push/action.ts";
import action from "@/subcommands/link/action.ts";

describe("link", () => {
  let api: APIClientTest;
  let projectId: string;

  const options = {};
  const FUNC_PATH = "functions/my_func";

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");

    projectId = api.jet.getProject({ projectName: "my_proj" })!.id;

    api.chdir("my_proj");

    ["a", "b", "c"].forEach((name, i) => {
      api.fs.writeTextFile(
        `migrations/00000000000${i}_${name}.sql`,
        name,
        {
          createNew: true,
        },
      );
    });

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

    await api.fs.mkdir(FUNC_PATH);
    await api.fs.mkdir(`${FUNC_PATH}/users`);
    await api.fs.mkdir(`${FUNC_PATH}/posts`);
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

  it("creates project .jcli directories", async () => {
    assert(!api.fs.hasDir("my_proj"));

    await action(options, projectId);

    assert(!api.fs.hasDir("my_proj"));
    assert(!api.fs.hasDir("my_proj/migrations"));
    assert(!api.fs.hasDir("my_proj/functions"));
    assert(api.fs.hasDir(".jcli"));
  });

  it("provisions metadata.db", async () => {
    await action(options, projectId);

    const expectedDatabase = PROJECT_DB_PATH;

    assert(api.db.hasDatabase(expectedDatabase));

    const database = await api.db.connect(expectedDatabase);

    const columns = database.prepare(
      `SELECT name, type, "notnull", pk FROM pragma_table_info(:tableName) ORDER BY name`
    ).all("metadata");

    assertEquals(columns.length, 1);

    assertObjectMatch(columns[0], {
      name: "project_id",
      type: "TEXT",
      notnull: 1,
      pk: 0,
    });

    const metadata = database.prepare(
      "SELECT project_id FROM metadata",
    ).all();

    assertEquals(metadata.length, 1);

    const project = api.jet.getProject({
      projectName: "my_proj",
    })!;

    assertEquals(metadata[0][0], project.id);

    database.close();
  });

  it("provisions configuration.db", async () => {
    await action(options, projectId);

    const expectedDatabase = PROJECT_DB_PATH;

    assert(api.db.hasDatabase(expectedDatabase));

    const database = await api.db.connect(expectedDatabase);

    const columns = database.prepare(
      `SELECT name, type, "notnull", pk FROM pragma_table_info(:tableName) ORDER BY name`
    ).all("configuration");

    assertEquals(columns.length, 1);

    assertObjectMatch(columns[0], {
      name: "data",
      type: "TEXT",
      notnull: 1,
      pk: 0,
    });

    const data = database.prepare("SELECT data FROM configuration").all();

    assertEquals(data.length, 1);

    assertObjectMatch(JSON.parse(data[0][0]), {
      name: "my_proj",
      title: "my_proj",
      capabilities: [],
      instances: [],
    });

    database.close();
  });

  it("clones migrations", async () => {
    await action(options, projectId);

    const expectedDatabase = PROJECT_DB_PATH;

    assert(api.db.hasDatabase(expectedDatabase));

    const db = await api.db.connect(expectedDatabase);

    const entries = db.prepare(
      "SELECT path, hash FROM objects WHERE filetype = 'MIGRATION' ORDER BY path",
    ).all();

    assertEquals(entries.length, 3);
    assertEquals(entries[0].path, "migrations/000000000000_a.sql");
    assertEquals(entries[0].hash, "0");
    assertEquals(entries[1].path, "migrations/000000000001_b.sql");
    assertEquals(entries[1].hash, "1");
    assertEquals(entries[2].path, "migrations/000000000002_c.sql");
    assertEquals(entries[2].hash, "2");

    db.close();
  });

  it("clones functions", async () => {
    await action(options, projectId);

    const expectedDatabase = PROJECT_DB_PATH;

    assert(api.db.hasDatabase(expectedDatabase));

    const db = await api.db.connect(expectedDatabase);

    const columns = db.prepare(
      `SELECT name, type, "notnull", pk FROM pragma_table_info(:tableName) ORDER BY name`
    ).all("functions");

    assertEquals(columns.length, 1);

    assertObjectMatch(columns[0], {
      name: "name",
      type: "TEXT",
      notnull: 0,
      pk: 1,
    });

    const funcEntries = db.prepare(
      "SELECT name FROM functions",
    ).all();

    assertEquals(funcEntries.length, 1);
    assertObjectMatch(funcEntries[0], { name: "my_func" });

    const fileEntries = db.prepare(
      "SELECT path, hash FROM objects WHERE filetype = 'FUNCTION' ORDER BY path",
    ).all();

    assertEquals(fileEntries.length, 3);
    assertEquals(fileEntries[0].path, `${FUNC_PATH}/index.ts`);
    assertEquals(fileEntries[0].hash, "index.ts");
    assertEquals(fileEntries[1].path, `${FUNC_PATH}/posts/entry.ts`);
    assertEquals(fileEntries[1].hash, "posts/entry.ts");
    assertEquals(fileEntries[2].path, `${FUNC_PATH}/users/mod.ts`);
    assertEquals(fileEntries[2].hash, "users/mod.ts");

    db.close();
  });
});
