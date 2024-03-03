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
import enablePlugin from "@/subcommands/plugin/enable/action.ts";

describe("enablePlugin", () => {
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

  it("enable plugins in the development environment for a given project", async () => {
    const instanceName = "test_plugin";

    await enablePlugin({ prod: false }, instanceName);

    const pluginEnableRequests = api.jet.getPluginEnableRequests(projectId);

    assertEquals(pluginEnableRequests?.length, 1);
    assertEquals(pluginEnableRequests?.[0].instanceName, instanceName);
    assertEquals(
      pluginEnableRequests?.[0].environmentName,
      "DEVELOPMENT",
    );
  });
});
