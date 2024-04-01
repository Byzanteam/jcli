import {
  afterEach,
  assertEquals,
  beforeEach,
  describe,
  it,
} from "@test/mod.ts";

import { setupAPI } from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "@/subcommands/function/inspect/action.ts";

describe("inspect", () => {
  let api: APIClientTest;
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

  it("print function inspection", async () => {
    api.console.configure({ capture: true });

    api.jet.setDeployment(projectId, "DEVELOPMENT", "main", {
      state: "RUNNING",
    });

    await action({}, "main");

    assertEquals(api.console.logs.length, 1);
    assertEquals(
      api.console.logs[0],
      "Environment\tDEVELOPMENT\nFunction\tmain\nDeployment State\tRUNNING",
    );

    api.jet.setDeployment(projectId, "PRODUCTION", "main", {
      state: "BOOTING",
    });

    await action({ prod: true }, "main");

    assertEquals(api.console.logs.length, 2);
    assertEquals(
      api.console.logs[1],
      "Environment\tPRODUCTION\nFunction\tmain\nDeployment State\tBOOTING",
    );
  });
});
