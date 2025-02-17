import { join } from "path";
import {
  afterEach,
  assertEquals,
  beforeEach,
  describe,
  it,
} from "@test/mod.ts";

import { PROJECT_ASSETS_DIRECTORY, setupAPI } from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "@/subcommands/function/inspect/action.ts";
import pushFunctionaction from "@/subcommands/push/action.ts";
import { colors } from "@cliffy/ansi";

describe("inspect", () => {
  let api: APIClientTest;
  let projectId: string;

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");

    projectId = api.jet.getProject({ projectName: "my_proj" })!.id;

    api.chdir("my_proj");

    await api.fs.mkdir(join(PROJECT_ASSETS_DIRECTORY, "functions", "main"));
    await api.fs.mkdir(join(PROJECT_ASSETS_DIRECTORY, "functions", "api"));
    await api.fs.mkdir(join(PROJECT_ASSETS_DIRECTORY, "functions", "_core"));
    await pushFunctionaction({ include: ["function"] });
  });

  afterEach(() => {
    api.cleanup();
  });

  it("print function inspection", async () => {
    api.console.configure({ capture: true });

    api.jet.setDeployment(projectId, "DEVELOPMENT", "main", {
      state: "RUNNING",
      endpoint: "https://breeze.rt/main",
    });

    await action({}, "main");

    assertEquals(api.console.logs.length, 1);
    assertEquals(
      api.console.logs[0],
      `Environment         DEVELOPMENT           \nFunction Name       main                  \nDeployment State    ${
        colors.green("RUNNING")
      }               \nDeployment Endpoint https://breeze.rt/main`,
    );

    api.jet.setDeployment(projectId, "PRODUCTION", "main", {
      state: "BOOTING",
    });

    await action({ prod: true }, "main");

    assertEquals(api.console.logs.length, 2);
    assertEquals(
      api.console.logs[1],
      `Environment         PRODUCTION\nFunction Name       main      \nDeployment State    ${
        colors.cyan("BOOTING")
      }   \nDeployment Endpoint N/A       `,
    );
  });

  it("print function inspection all", async () => {
    api.console.configure({ capture: true });

    api.jet.setDeployment(projectId, "DEVELOPMENT", "main", {
      state: "RUNNING",
      endpoint: "https://breeze.rt/main",
    });

    api.jet.setDeployment(projectId, "DEVELOPMENT", "api", {
      state: "BOOTING",
    });

    await action({});

    assertEquals(api.console.logs.length, 1);

    assertEquals(
      api.console.logs[0],
      `Environment         DEVELOPMENT\nFunction Name       api        \nDeployment State    ${
        colors.cyan("BOOTING")
      }    \nDeployment Endpoint N/A        \n\nEnvironment         DEVELOPMENT           \nFunction Name       main                  \nDeployment State    ${
        colors.green("RUNNING")
      }               \nDeployment Endpoint https://breeze.rt/main`,
    );
  });
});
