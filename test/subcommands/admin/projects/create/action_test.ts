import {
  assert,
  assertEquals,
  assertNotEquals,
  assertObjectMatch,
  assertRejects,
} from "@test/mod.ts";

import { PROJECT_DB_PATH } from "@/api/mod.ts";

import { afterEach, beforeEach, describe, it } from "@test/mod.ts";

import { setupAPI } from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import action from "@/subcommands/admin/projects/create/action.ts";

describe("works", () => {
  let api: APIClientTest;
  const options = {};

  beforeEach(() => {
    api = makeAPIClient();
    setupAPI(api);
  });

  afterEach(() => {
    api.cleanup();
  });

  it("create project on server", async () => {
    assert(!api.jet.hasProject({ projectName: "my_proj" }));

    await action(options, "my_proj");

    const project = api.jet.getProject({ projectName: "my_proj" });
    assertNotEquals(project, undefined);
    assertEquals(project?.name, "my_proj");
    assertEquals(project?.title, "my_proj");
  });

  it("make project directories", async () => {
    assert(!api.fs.hasDir("my_proj"));

    await action(options, "my_proj");

    assert(api.fs.hasDir("my_proj"));
    assert(api.fs.hasDir("my_proj/migrations"));
    assert(api.fs.hasDir("my_proj/functions"));
    assert(api.fs.hasDir("my_proj/.jcli"));
  });

  it("provision my_proj/project.json", async () => {
    await action(options, "my_proj");

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

  it("provision metadata.db", async () => {
    await action(options, "my_proj");

    const expectedDatabase = `my_proj/${PROJECT_DB_PATH}`;

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

  it("provision objects.db", async () => {
    await action(options, "my_proj");

    const expectedDatabase = `my_proj/${PROJECT_DB_PATH}`;

    assert(api.db.hasDatabase(expectedDatabase));

    const database = await api.db.connect(expectedDatabase);

    const columns = database.prepare(
      `SELECT name, type, "notnull", pk FROM pragma_table_info(:tableName) ORDER BY name`,
    ).all("objects");

    assertEquals(columns.length, 3);

    assertObjectMatch(columns[0], {
      name: "filetype",
      type: "TEXT",
      notnull: 1,
      pk: 0,
    });

    assertObjectMatch(columns[1], {
      name: "hash",
      type: "TEXT",
      notnull: 1,
      pk: 0,
    });

    assertObjectMatch(columns[2], {
      name: "path",
      type: "TEXT",
      notnull: 0,
      pk: 1,
    });

    database.close();
  });

  it("provision functions.db", async () => {
    await action(options, "my_proj");

    const expectedDatabase = `my_proj/${PROJECT_DB_PATH}`;

    assert(api.db.hasDatabase(expectedDatabase));

    const database = await api.db.connect(expectedDatabase);

    const columns = database.prepare(
      `SELECT name, type, "notnull", pk FROM pragma_table_info(:tableName) ORDER BY name`
    ).all("functions");

    assertEquals(columns.length, 1);

    assertObjectMatch(columns[0], {
      name: "name",
      type: "TEXT",
      notnull: 0,
      pk: 1,
    });

    database.close();
  });

  it("provision configuration.db", async () => {
    await action(options, "my_proj");

    const expectedDatabase = `my_proj/${PROJECT_DB_PATH}`;

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
});

describe("fails", () => {
  const alreadyExistDir = "dir_existed";
  const alreadyExistProject = "name_existed";

  let api: APIClientTest;
  const options = {};

  beforeEach(() => {
    api = makeAPIClient();

    api.fs.mkdir(alreadyExistDir);

    api.jet.createProject({
      name: alreadyExistProject,
      title: alreadyExistProject,
    });

    setupAPI(api);
  });

  it("invalid project name", () => {
    assertRejects(() => action(options, "@invalid-name"));
  });

  it("failed to make project directory", () => {
    assertRejects(() => action(options, alreadyExistDir));
  });

  it("failed to create project on server", () => {
    assertRejects(() => action(options, alreadyExistProject));
  });
});
