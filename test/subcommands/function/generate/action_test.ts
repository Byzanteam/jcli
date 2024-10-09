import {
  afterEach,
  assert,
  assertEquals,
  beforeEach,
  describe,
  it,
} from "@test/mod.ts";
import { setupAPI } from "@/api/mod.ts";
import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "../../../../src/subcommands/function/generate/action.ts";

describe("generate", () => {
  let api: APIClientTest;
  const options = {};

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");
    api.chdir("my_proj");
    api.console.configure({ capture: true });
  });

  afterEach(() => {
    api.cleanup();
  });

  it("should create the correct function folder and template file", async () => {
    await action(options, "api");

    assert(
      api.fs.hasDir("functions/api"),
      "Expected directory 'functions/api' to be created.",
    );
    assert(
      api.fs.hasFile("functions/api/main.ts"),
      "Expected file 'functions/api/main.ts' to be created.",
    );

    const expectedContent = `import { Hono } from "jsr:@hono/hono";
import { serveHttp } from "https://cdn.jsdelivr.net/gh/byzanteam/breeze-js@v0.2.2/lib/runtime.ts";

const app = new Hono();

app.get("/", (c) => c.text("Hello, Jet!"));

serveHttp(app.fetch);\n`;

    const actualContent = await api.fs.readTextFile("functions/api/main.ts");
    assertEquals(
      actualContent,
      expectedContent,
      "The file content is incorrect.",
    );
  });

  it("should log an error for invalid function name", async () => {
    await action(options, "ap-i");

    assert(api.console.logs.length === 1, "Expected exactly one log entry.");

    const expectedLog =
      "Invalid function name. Only alphanumeric characters and underscores are allowed.";

    assertEquals(
      api.console.logs[0],
      expectedLog,
      "The logged error message is incorrect.",
    );
  });
});
