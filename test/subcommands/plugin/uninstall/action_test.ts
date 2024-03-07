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
import installPlugin from "@/subcommands/plugin/install/action.ts";
import unstallPlugin from "@/subcommands/plugin/uninstall/action.ts";

describe("uninstallPlugin", () => {
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

  it("uninstall plugins in the development environment for a given project", async () => {
    const instanceName = "test_plugin";

    await installPlugin({ prod: false }, instanceName);

    const pluginInstallRequests = api.jet.getPluginInstallRequests(projectId);

    assertEquals(pluginInstallRequests?.length, 1);
    assertEquals(pluginInstallRequests?.[0].instanceName, instanceName);
    assertEquals(
      pluginInstallRequests?.[0].environmentName,
      "DEVELOPMENT",
    );

    await unstallPlugin({ prod: false }, instanceName);

    assertEquals(api.jet.getPluginInstallRequests(projectId)?.length, 0);
  });
});
