import {
  assert,
  assertEquals,
  assertNotEquals,
  assertObjectMatch,
  assertRejects,
} from "@test/mod.ts";

import { makeAPIClient, ProjectObject } from "@test/api/mod.ts";

import makeAction from "@/subcommands/admin/projects/create/action.ts";

Deno.test("works", async (t) => {
  const setup = () => {
    const api = makeAPIClient();
    const action = makeAction(api);
    const options = {};

    return {
      api,
      action,
      options,
      cleanup() {
        api.cleanup();
      },
    };
  };

  await t.step("create project on server", async () => {
    const { api, action, options, cleanup } = setup();

    assert(!api.jet.hasProject({ projectName: "my_proj" }));

    await action(options, "my_proj");

    const project = api.jet.getProject({ projectName: "my_proj" });
    assertNotEquals(project, undefined);
    assertEquals(project?.name, "my_proj");
    assertEquals(project?.title, "my_proj");

    cleanup();
  });

  await t.step("make project directories", async () => {
    const { api, action, options, cleanup } = setup();

    assert(!api.fs.hasDir("my_proj"));

    await action(options, "my_proj");

    assert(api.fs.hasDir("my_proj"));
    assert(api.fs.hasDir("my_proj/migrations"));
    assert(api.fs.hasDir("my_proj/functions"));
    assert(api.fs.hasDir("my_proj/.jcli"));

    cleanup();
  });

  await t.step("provision my_proj/project.json", async () => {
    const { api, action, options, cleanup } = setup();

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

    cleanup();
  });

  await t.step("provision my_proj/.jcli/metadata.json", async () => {
    const { api, action, options, cleanup } = setup();

    await action(options, "my_proj");

    const metadata = JSON.parse(
      await api.fs.readTextFile("my_proj/.jcli/metadata.json"),
    ) as Record<"projectId", unknown>;

    const project = api.jet.getProject({
      projectName: "my_proj",
    }) as ProjectObject;

    assertObjectMatch(metadata, { projectId: project.id });

    cleanup();
  });

  await t.step("provision project.db", async () => {
    const { api, action, options, cleanup } = setup();

    await action(options, "my_proj");

    const expectedDatabase = "my_proj/.jcli/project.sqlite";

    assert(api.db.hasDatabase(expectedDatabase));

    const database = await api.db.connect(expectedDatabase);

    const columns = database.queryEntries<
      { name: string; type: string }
    >("SELECT name, type FROM pragma_table_info(:tableName) ORDER BY name", {
      tableName: "file_hashes",
    });

    assertEquals(columns.length, 2);
    assertObjectMatch(columns[0], { name: "hash", type: "BLOB" });
    assertObjectMatch(columns[1], { name: "path", type: "TEXT" });

    database.close();

    cleanup();
  });
});

Deno.test("fails", async (t) => {
  const alreadyExistDir = "dir_existed";
  const alreadyExistProject = "name_existed";

  const setup = () => {
    const api = makeAPIClient();

    api.fs.mkdir(alreadyExistDir);

    api.jet.createProject({
      name: alreadyExistProject,
      title: alreadyExistProject,
    });

    const action = makeAction(api);
    const options = {};

    return {
      api,
      action,
      options,
      cleanup() {
        api.cleanup();
      },
    };
  };

  await t.step("invalid project name", () => {
    const { action, options, cleanup } = setup();

    assertRejects(() => action(options, "@invalid-name"));

    cleanup();
  });

  await t.step("failed to make project directory", () => {
    const { action, options, cleanup } = setup();

    assertRejects(() => action(options, alreadyExistDir));

    cleanup();
  });

  await t.step("failed to create project on server", () => {
    const { action, options, cleanup } = setup();

    assertRejects(() => action(options, alreadyExistProject));

    cleanup();
  });
});
