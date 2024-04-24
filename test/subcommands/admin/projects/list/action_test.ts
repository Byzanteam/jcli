import {
  afterEach,
  assert,
  assertEquals,
  beforeEach,
  describe,
  it,
} from "@test/mod.ts";

import { setupAPI } from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "@/subcommands/admin/projects/list/action.ts";

describe("set variable", () => {
  let api: APIClientTest;
  const options = {};
  let projectId: string;

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");
    projectId = api.jet.getProject({ projectName: "my_proj" })!.id;

    api.chdir("my_proj");
  });

  afterEach(() => {
    api.cleanup();
  });

  it("works", async () => {
    api.console.configure({ capture: true });

    await action(options);

    assertEquals(api.console.logs.length, 1);

    const logs = api.console.logs.toSorted();
    assert(logs[0].includes("my_proj"));
    assert(logs[0].includes(projectId));
  });
});
