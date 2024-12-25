import {
  afterEach,
  assertEquals,
  assertObjectMatch,
  beforeEach,
  describe,
  it,
} from "@test/mod.ts";
import { PROJECT_DB_PATH, setupAPI } from "@/api/mod.ts";
import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "@/subcommands/push/action.ts";
import { PushOptions } from "@/subcommands/push/option.ts";

describe("workflows", () => {
  let api: APIClientTest;
  let projectId: string;

  const options: PushOptions = { onlyWorkflows: true };

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

  describe("new functions", () => {
    beforeEach(async () => {
      const data = JSON.stringify({
        name: "traffic",
        declaractions: "",
        structure: {},
      });
      await api.fs.writeTextFile("workflows/workflow.json", data, {
        createNew: true,
      });
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
      const traffic = JSON.stringify({
        name: "traffic",
        declaractions: "",
        structure: {},
      });
      await api.fs.writeTextFile("workflows/traffic.json", traffic, {
        createNew: true,
      });
      const light = JSON.stringify({
        name: "light",
        declaractions: "",
        structure: {},
      });
      await api.fs.writeTextFile("workflows/light.json", light, {
        createNew: true,
      });

      await action(options);

      await api.fs.remove("workflows/light.json");

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
