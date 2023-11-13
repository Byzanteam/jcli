import {
  assertEquals,
  assertNotEquals,
  assertObjectMatch,
  assertRejects,
} from "@test/mod.ts";

import { afterEach, beforeEach, describe, it } from "@test/mod.ts";

import { PROJECT_DB_PATH, setupAPI } from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "@/subcommands/push/action.ts";

describe("configuration", () => {
  let api: APIClientTest;
  let projectUuid: string;

  const options = { onlyConfiguration: true };

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");

    api.chdir("my_proj");

    projectUuid = api.jet.getProject({ projectName: "my_proj" })!.id;
  });

  afterEach(() => {
    api.cleanup();
  });

  describe("works", () => {
    const newConfiguration = {
      name: "name",
      title: "title",
      capabilities: [
        {
          name: "capability1",
          payload: { __type__: "database", schema: "schema" },
        },
      ],
      instances: [
        {
          pluginName: "plugin",
          name: "instance",
          description: "description",
          config: { token: "token" },
          capabilityNames: ["capability1"],
        },
      ],
    };

    beforeEach(async () => {
      await api.fs.writeTextFile(
        "project.json",
        JSON.stringify(newConfiguration),
      );

      await action(options);
    });

    it("pushes to jet", () => {
      const patches = api.jet.getConfigurationPatches(projectUuid);

      assertNotEquals(patches, undefined);
      assertEquals(patches!.length, 1);

      assertObjectMatch(patches![0], {
        name: "name",
        title: "title",
        capabilities: [
          {
            action: "CREATE",
            name: "capability1",
            payload: { __type__: "database", schema: "schema" },
          },
        ],
        instances: [
          {
            action: "CREATE",
            pluginName: "plugin",
            name: "instance",
            description: "description",
            config: { token: "token" },
            capabilityNames: ["capability1"],
          },
        ],
      });
    });

    it("updates db", async () => {
      const db = await api.db.connect(PROJECT_DB_PATH);
      const entries = db.queryEntries<{ data: string }>(
        "SELECT data FROM configuration",
      );

      assertEquals(entries.length, 1);

      const config = JSON.parse(entries[0].data);

      assertObjectMatch(config, newConfiguration);

      db.close();
    });
  });

  describe("fails", () => {
    const invalidConfiguration = {
      name: "name",
      title: "title",
      capabilities: [
        {
          name: "capability1",
          payload: { __type__: "invalid", schema: "schema" },
        },
      ],
      instances: [
        {
          name: "instance",
          description: "description",
          config: { token: "token" },
          capabilityNames: ["capability1"],
        },
      ],
    };

    beforeEach(async () => {
      await api.fs.writeTextFile(
        "project.json",
        JSON.stringify(invalidConfiguration),
      );
    });

    it("rejects invalid configuration", async () => {
      await assertRejects(async () => {
        await action(options);
      }, "Invalid configuration");

      const patches = api.jet.getConfigurationPatches(projectUuid);

      assertEquals(patches!.length, 0);

      const db = await api.db.connect(PROJECT_DB_PATH);
      const entries = db.queryEntries<{ data: string }>(
        "SELECT data FROM configuration",
      );

      const config = JSON.parse(entries[0].data);

      assertObjectMatch(config, {
        name: "my_proj",
        title: "my_proj",
        capabilities: [],
        instances: [],
      });

      db.close();
    });
  });
});
