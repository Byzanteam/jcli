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

import { APIClientTest, makeAPIClient, ProjectObject } from "@test/api/mod.ts";

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

  it("provision my_proj/.jcli/metadata.json", async () => {
    await action(options, "my_proj");

    const metadata = JSON.parse(
      await api.fs.readTextFile("my_proj/.jcli/metadata.json"),
    ) as Record<"projectId", unknown>;

    const project = api.jet.getProject({
      projectName: "my_proj",
    }) as ProjectObject;

    assertObjectMatch(metadata, { projectId: project.id });
  });

  it("provision project.db", async () => {
    await action(options, "my_proj");

    const expectedDatabase = `my_proj/${PROJECT_DB_PATH}`;

    assert(api.db.hasDatabase(expectedDatabase));

    const database = await api.db.connect(expectedDatabase);

    const columns = database.queryEntries<
      { name: string; type: string; notnull: number; pk: number }
    >(
      `SELECT name, type, "notnull", pk FROM pragma_table_info(:tableName) ORDER BY name`,
      { tableName: "objects" },
    );

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
