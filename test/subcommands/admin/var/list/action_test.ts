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
import setVariable from "@/subcommands/admin/var/set/action.ts";
import action from "@/subcommands/admin/var/list/action.ts";

describe("set variable", () => {
  let api: APIClientTest;
  const options = {};

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");

    api.chdir("my_proj");

    setVariable({}, "FOO1", "bar1");
    setVariable({}, "FOO2", "bar2");
    setVariable({}, "FOO3", "bar3");
  });

  afterEach(() => {
    api.cleanup();
  });

  it("works", async () => {
    api.console.configure({ capture: true });

    await action(options);

    assertEquals(api.console.logs.length, 3);

    const logs = api.console.logs.toSorted();

    assertEquals(logs[0], "FOO1=bar1");
    assertEquals(logs[1], "FOO2=bar2");
    assertEquals(logs[2], "FOO3=bar3");
  });
});
