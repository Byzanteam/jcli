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
import setVariable from "@/subcommands/admin/var/set/action.ts";
import action from "@/subcommands/admin/var/unset/action.ts";

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

    setVariable({}, "FOO", "bar");
    setVariable({ prod: true }, "FOO", "bar");
  });

  afterEach(() => {
    api.cleanup();
  });

  it("works", async () => {
    let environmentVariables = api.jet.getEnvironmentVariables(
      projectId,
      "DEVELOPMENT",
    );

    assertNotEquals(environmentVariables, undefined);

    assertEquals(environmentVariables?.size, 1);
    assertEquals(environmentVariables?.get("FOO"), "bar");

    await action(options, "FOO");

    environmentVariables = api.jet.getEnvironmentVariables(
      projectId,
      "DEVELOPMENT",
    );

    assertNotEquals(environmentVariables, undefined);

    assertEquals(environmentVariables?.size, 0);

    await action(options, "FOO");

    environmentVariables = api.jet.getEnvironmentVariables(
      projectId,
      "DEVELOPMENT",
    );

    assertNotEquals(environmentVariables, undefined);

    assertEquals(environmentVariables?.size, 0);

    environmentVariables = api.jet.getEnvironmentVariables(
      projectId,
      "PRODUCTION",
    );

    assertEquals(environmentVariables?.size, 1);
  });

  it("works with --prod", async () => {
    let environmentVariables = api.jet.getEnvironmentVariables(
      projectId,
      "PRODUCTION",
    );

    assertNotEquals(environmentVariables, undefined);

    assertEquals(environmentVariables?.size, 1);
    assertEquals(environmentVariables?.get("FOO"), "bar");

    await action({ prod: true }, "FOO");

    environmentVariables = api.jet.getEnvironmentVariables(
      projectId,
      "PRODUCTION",
    );

    assertNotEquals(environmentVariables, undefined);

    assertEquals(environmentVariables?.size, 0);

    await action({ prod: true }, "FOO");

    environmentVariables = api.jet.getEnvironmentVariables(
      projectId,
      "PRODUCTION",
    );

    assertNotEquals(environmentVariables, undefined);

    assertEquals(environmentVariables?.size, 0);

    environmentVariables = api.jet.getEnvironmentVariables(
      projectId,
      "DEVELOPMENT",
    );

    assertEquals(environmentVariables?.size, 1);
  });
});
