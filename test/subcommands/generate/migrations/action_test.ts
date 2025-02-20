import {
  afterEach,
  assert,
  assertEquals,
  beforeEach,
  describe,
  FakeTime,
  it,
} from "@test/mod.ts";
import { setupAPI } from "@/api/mod.ts";
import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "@/subcommands/generate/migrations/action.ts";

describe("migrations generate", () => {
  let api: APIClientTest;
  const options = {};

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");
    api.chdir("my_proj");
    api.console.configure({ capture: true });
    new FakeTime();
  });

  afterEach(() => {
    api.cleanup();
  });

  it("should create the correct function folder and template file", async () => {
    const migrationName = "create_users";
    await action(options, migrationName);

    const timestamp = new Date()
      .toISOString().replace(/[-T:\.Z]/g, "")
      .slice(0, 12);
    const fileName = `${timestamp}_${migrationName}.sql`;

    assert(
      api.fs.hasDir("migrations"),
      "Expected directory 'migrations' to be created.",
    );
    assert(
      api.fs.hasFile(`migrations/${fileName}`),
      `Expected file 'migrations/${fileName}' to be created.`,
    );

    const expectedContent = `-- migrate:up\n\n-- migrate:down`;

    const actualContent = await api.fs.readTextFile(`migrations/${fileName}`);
    assertEquals(
      actualContent,
      expectedContent,
      "The file content is incorrect.",
    );
  });

  it("should log an error for invalid function name", async () => {
    await action(options, "create_user-s");

    assert(api.console.logs.length === 1, "Expected exactly one log entry.");

    const expectedLog =
      "Invalid migration name. Only lowercase letters, numbers, and underscores are allowed, with a maximum length of 255 characters.";

    assertEquals(
      api.console.logs[0],
      expectedLog,
      "The logged error message is incorrect.",
    );
  });
});
