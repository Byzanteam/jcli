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
import action from "@/subcommands/function/logs/action.ts";

describe("logs", () => {
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

  it("print logs", async () => {
    api.console.configure({ capture: true });

    api.jet.setDeploymentLogs(projectId, "DEVELOPMENT", [
      {
        functionName: "main",
        message: "hello",
        severity: "INFO",
        timestamp: "timestamp1",
      },
      {
        functionName: "main",
        message: "world",
        severity: "INFO",
        timestamp: "timestamp2",
      },
      {
        functionName: "api",
        message: "foo",
        severity: "INFO",
        timestamp: "timestamp3",
      },
    ]);

    await action({});

    assertEquals(api.console.logs.length, 3);
    assertEquals(api.console.logs[0], "api timestamp3 INFO foo");
    assertEquals(api.console.logs[1], "main timestamp2 INFO world");
    assertEquals(api.console.logs[2], "main timestamp1 INFO hello");

    await action({ length: 2 });

    assertEquals(api.console.logs.length, 5);
    assertEquals(api.console.logs[3], "main timestamp2 INFO world");
    assertEquals(api.console.logs[4], "main timestamp1 INFO hello");

    await action({ length: 10 }, "api");

    assertEquals(api.console.logs.length, 6);
    assertEquals(api.console.logs[5], "api timestamp3 INFO foo");
  });
});
