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
    };
  };

  await t.step("create project on server", async () => {
    const { api, action, options } = setup();

    assert(!api.jet.hasProject({ projectName: "my_proj" }));

    await action(options, "my_proj");

    const project = api.jet.getProject({ projectName: "my_proj" });
    assertNotEquals(project, undefined);
    assertEquals(project?.name, "my_proj");
    assertEquals(project?.title, "my_proj");
  });

  await t.step("make project directories", async () => {
    const { api, action, options } = setup();

    assert(!api.fs.hasDir("my_proj"));

    await action(options, "my_proj");

    assert(api.fs.hasDir("my_proj"));
    assert(api.fs.hasDir("my_proj/migrations"));
    assert(api.fs.hasDir("my_proj/functions"));
    assert(api.fs.hasDir("my_proj/.jcli"));
  });

  await t.step("provision my_proj/project.json", async () => {
    const { api, action, options } = setup();

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

  await t.step("provision my_proj/.jcli/metadata.json", async () => {
    const { api, action, options } = setup();

    await action(options, "my_proj");

    const metadata = JSON.parse(
      await api.fs.readTextFile("my_proj/.jcli/metadata.json"),
    ) as Record<"projectId", unknown>;

    const project = api.jet.getProject({
      projectName: "my_proj",
    }) as ProjectObject;

    assertObjectMatch(metadata, { projectId: project.id });
  });
});

Deno.test("fails", async (t) => {
  const api = makeAPIClient();

  const alreadyExistDir = "dir_existed";
  api.fs.mkdir(alreadyExistDir);

  const alreadyExistProject = "name_existed";
  api.jet.createProject({
    name: alreadyExistProject,
    title: alreadyExistProject,
  });

  const action = makeAction(api);
  const options = {};

  await t.step("invalid project name", () => {
    assertRejects(() => action(options, "@invalid-name"));
  });

  await t.step("failed to make project directory", () => {
    assertRejects(() => action(options, alreadyExistDir));
  });

  await t.step("failed to create project on server", () => {
    assertRejects(() => action(options, alreadyExistProject));
  });
});
