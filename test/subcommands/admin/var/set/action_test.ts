import {
  afterEach,
  assertEquals,
  assertNotEquals,
  beforeEach,
  describe,
  it,
} from "@test/mod.ts";

import { setupAPI } from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "@/subcommands/admin/var/set/action.ts";

describe("set variable", () => {
  let api: APIClientTest;
  let projectId: string;
  const options = {};

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
    await action(options, "FOO1", "bar1");
    await action(options, "FOO2", "bar2");

    let environmentVariables = api.jet.getEnvironmentVariables(
      projectId,
      "DEVELOPMENT",
    );

    assertNotEquals(environmentVariables, undefined);

    assertEquals(environmentVariables?.size, 2);
    assertEquals(environmentVariables?.get("FOO1"), "bar1");
    assertEquals(environmentVariables?.get("FOO2"), "bar2");

    environmentVariables = api.jet.getEnvironmentVariables(
      projectId,
      "PRODUCTION",
    );

    assertEquals(environmentVariables?.size, 0);
  });

  it("works with --prod", async () => {
    await action({ prod: true }, "FOO1", "bar1");

    let environmentVariables = api.jet.getEnvironmentVariables(
      projectId,
      "PRODUCTION",
    );

    assertNotEquals(environmentVariables, undefined);

    assertEquals(environmentVariables?.size, 1);
    assertEquals(environmentVariables?.get("FOO1"), "bar1");

    environmentVariables = api.jet.getEnvironmentVariables(
      projectId,
      "DEVELOPMENT",
    );

    assertEquals(environmentVariables?.size, 0);
  });
});
