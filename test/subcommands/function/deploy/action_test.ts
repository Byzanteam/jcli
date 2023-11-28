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
import action from "@/subcommands/function/deploy/action.ts";

describe("deploy", () => {
  let api: APIClientTest;
  let projectUuid: string;
  const options = {};

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");

    projectUuid = api.jet.getProject({ projectName: "my_proj" })!.id;

    api.chdir("my_proj");
  });

  afterEach(() => {
    api.cleanup();
  });

  it("works", async () => {
    await action(options);

    const deployRequests = api.jet.getDeployDraftFunctionsRequests(
      projectUuid,
    )!;

    assertEquals(deployRequests, 1);
  });
});
