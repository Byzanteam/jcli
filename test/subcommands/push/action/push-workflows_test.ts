import { join } from "path";

import {
  afterEach,
  assertEquals,
  assertObjectMatch,
  beforeEach,
  describe,
  it,
} from "@test/mod.ts";
import {
  PROJECT_ASSETS_DIRECTORY,
  PROJECT_DB_PATH,
  setupAPI,
} from "@/api/mod.ts";
import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "@/subcommands/push/action.ts";
import { PushOptions } from "@/subcommands/push/option.ts";

describe("workflows", () => {
  let api: APIClientTest;
  let projectId: string;

  const options: PushOptions = { onlyWorkflows: true };

  async function writeWorkflowFile(name: string, data: object) {
    const file = join(PROJECT_ASSETS_DIRECTORY, "workflows", name);
    const content = JSON.stringify(data);

    await api.fs.writeTextFile(file, content, { createNew: true });
  }

  async function removeWorkflowFile(name: string) {
    const file = join(PROJECT_ASSETS_DIRECTORY, "workflows", name);
    await api.fs.remove(file);
  }

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");

    api.chdir("my_proj");

    projectId = api.jet.getProject({ projectName: "my_proj" })!.id;
  });

  afterEach(() => {
    api.cleanup();
  });

  describe("new workflows", () => {
    beforeEach(async () => {
      const data = {
        name: "traffic",
        declaractions: "",
        structure: {},
      };
      await writeWorkflowFile("traffic.json", data);
      await action(options);
    });

    it("updates db", async () => {
      const db = await api.db.connect(PROJECT_DB_PATH);
      const entries = db.queryEntries<{ name: string }>(
        "SELECT name FROM workflows",
      );

      assertEquals(entries.length, 1);
      assertObjectMatch(entries[0], { name: "traffic" });

      db.close();
    });

    it("pushed to jet", () => {
      const workflows = api.jet.getWorkflows(projectId);

      assertEquals(workflows!.size, 1);
      assertEquals(Array.from(workflows!.keys()), ["traffic"]);
      assertObjectMatch(workflows!.get("traffic")!, { name: "traffic" });
    });
  });

  describe("delete workflows", () => {
    beforeEach(async () => {
      const traffic = {
        name: "traffic",
        declaractions: "",
        structure: {},
      };
      await writeWorkflowFile("traffic.json", traffic);
      const light = {
        name: "light",
        declaractions: "",
        structure: {},
      };
      await writeWorkflowFile("light.json", light);

      await action(options);

      await removeWorkflowFile("light.json");

      await action(options);
    });

    it("updates db", async () => {
      const db = await api.db.connect(PROJECT_DB_PATH);
      const entries = db.queryEntries<{ name: string }>(
        "SELECT name FROM workflows",
      );

      assertEquals(entries.length, 1);
      assertObjectMatch(entries[0], { name: "traffic" });

      db.close();
    });

    it("pushed to jet", () => {
      const workflows = api.jet.getWorkflows(projectId);

      assertEquals(workflows!.size, 1);
      assertEquals(Array.from(workflows!.keys()), ["traffic"]);
      assertObjectMatch(workflows!.get("traffic")!, { name: "traffic" });
    });
  });
});
