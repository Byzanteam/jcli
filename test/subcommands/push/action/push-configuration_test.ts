import {
  assertEquals,
  assertNotEquals,
  assertObjectMatch,
  assertRejects,
} from "@test/mod.ts";

import { afterEach, beforeEach, describe, it } from "@test/mod.ts";
import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import { PROJECT_DB_PATH, setupAPI } from "@/api/mod.ts";
import createProject from "@/subcommands/admin/projects/create/action.ts";
import action from "@/subcommands/push/action.ts";
import { PushOptions } from "@/subcommands/push/option.ts";

describe("configuration", () => {
  let api: APIClientTest;
  let projectId: string;

  const options: PushOptions = { include: ["configuration"] };

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
      imports: {
        "#functions": "./",
      },
      scopes: {
        "https://deno.land/x/example/": {
          "@std/foo": "./patched/mod.ts",
        },
      },
      runningWorkflows: {},
    };

    beforeEach(async () => {
      await api.fs.writeTextFile(
        "project.json",
        JSON.stringify(newConfiguration),
      );

      await action(options);
    });

    it("pushes to jet", () => {
      const patches = api.jet.getConfigurationPatches(projectId);

      assertNotEquals(patches, undefined);
      assertEquals(patches!.length, 1);

      assertObjectMatch(patches![0], {
        title: "title",
        capabilities: [
          {
            action: "create",
            name: "capability1",
            payload: { __type__: "database", schema: "schema" },
          },
        ],
        instances: [
          {
            action: "create",
            pluginName: "plugin",
            name: "instance",
            description: "description",
            config: { token: "token" },
            capabilityNames: ["capability1"],
          },
        ],
        imports: { "#functions": "./" },
        scopes: {
          "https://deno.land/x/example/": { "@std/foo": "./patched/mod.ts" },
        },
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

  describe("does not push importmap", () => {
    const newConfiguration = {
      name: "name",
      title: "title",
      capabilities: [],
      instances: [],
      runningWorkflows: {},
    };

    beforeEach(async () => {
      await api.fs.writeTextFile(
        "project.json",
        JSON.stringify(newConfiguration),
      );

      await action(options);
    });

    it("pushes to jet", () => {
      const patches = api.jet.getConfigurationPatches(projectId);

      assertNotEquals(patches, undefined);
      assertEquals(patches!.length, 1);

      assertObjectMatch(patches![0], {
        title: "title",
        capabilities: [],
        instances: [],
      });
      assertEquals(patches![0].imports, undefined);
      assertEquals(patches![0].scopes, undefined);
    });

    it("updates db", async () => {
      const db = await api.db.connect(PROJECT_DB_PATH);
      const entries = db.queryEntries<{ data: string }>(
        "SELECT data FROM configuration",
      );

      assertEquals(entries.length, 1);

      const config = JSON.parse(entries[0].data);

      assertObjectMatch(config, newConfiguration);
      assertEquals(config.imports, undefined);
      assertEquals(config.scopes, undefined);

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

      const patches = api.jet.getConfigurationPatches(projectId);

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

  describe("fails importmap", () => {
    const invalidConfiguration = {
      name: "name",
      title: "title",
      capabilities: [],
      instances: [],
      imports: {
        "#functions": 1,
      },
      scopes: {
        "https://deno.land/x/example/": {
          "@std/foo": "./patched/mod.ts",
        },
      },
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

      const patches = api.jet.getConfigurationPatches(projectId);

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
      assertEquals(config.imports, undefined);
      assertEquals(config.scopes, undefined);

      db.close();
    });
  });

  describe("instances", () => {
    const initialConfiguration = {
      name: "name",
      title: "title",
      capabilities: [],
      instances: [
        {
          capabilityNames: [],
          config: { queues: ["timing", "default"] },
          name: "queue",
          pluginName: "queue",
        },
        {
          capabilityNames: [],
          config: { pluginKey: "{{ TIME_SLOT_RESERVATION_TOWER_PLUGIN_KEY }}" },
          name: "tower",
          pluginName: "tower",
        },
        {
          capabilityNames: [],
          config: {
            accessKeyId: "{{ ACCESS_KEY_ID }}",
            accessSecret: "{{ ACCESS_SECRET }}",
            queues: "default:20,timing:10",
            signName: "{{ SIGN_NAME }}",
          },
          name: "sms",
          pluginName: "sms",
        },
      ],
      runningWorkflows: {},
    };

    const configurationWithUpdatedInstance = {
      name: "name",
      title: "title",
      capabilities: [],
      instances: [
        {
          capabilityNames: [],
          config: { pluginKey: "{{ NEW_PLUGIN_KEY }}" }, // Modified value
          name: "tower",
          pluginName: "tower",
        },
        // order changed
        {
          capabilityNames: [],
          config: { queues: ["timing", "default"] },
          name: "queue",
          pluginName: "queue",
        },
        {
          capabilityNames: [],
          config: {
            accessKeyId: "{{ ACCESS_KEY_ID }}",
            accessSecret: "{{ ACCESS_SECRET }}",
            queues: "default:20,timing:10",
            signName: "{{ SIGN_NAME }}",
          },
          name: "sms",
          pluginName: "sms",
        },
      ],
      runningWorkflows: {},
    };

    const configurationWithRemovedInstance = {
      name: "name",
      title: "title",
      capabilities: [],
      instances: [
        {
          capabilityNames: [],
          config: {
            accessKeyId: "{{ ACCESS_KEY_ID }}",
            accessSecret: "{{ ACCESS_SECRET }}",
            queues: "default:20,timing:10",
            signName: "{{ SIGN_NAME }}",
          },
          name: "sms",
          pluginName: "sms",
        },
        // order changed
        {
          capabilityNames: [],
          config: { queues: ["timing", "default"] },
          name: "queue",
          pluginName: "queue",
        },
      ],
      runningWorkflows: {},
    };

    const configurationWithChangedOrder = {
      name: "name",
      title: "title",
      capabilities: [],
      instances: [
        {
          capabilityNames: [],
          config: { pluginKey: "{{ TIME_SLOT_RESERVATION_TOWER_PLUGIN_KEY }}" },
          name: "tower",
          pluginName: "tower",
        },
        {
          capabilityNames: [],
          config: { queues: ["timing", "default"] },
          name: "queue",
          pluginName: "queue",
        },
        {
          capabilityNames: [],
          config: {
            accessKeyId: "{{ ACCESS_KEY_ID }}",
            accessSecret: "{{ ACCESS_SECRET }}",
            queues: "default:20,timing:10",
            signName: "{{ SIGN_NAME }}",
          },
          name: "sms",
          pluginName: "sms",
        },
      ],
      runningWorkflows: {},
    };

    beforeEach(async () => {
      await api.fs.writeTextFile(
        "project.json",
        JSON.stringify(initialConfiguration),
      );

      await action(options);
    });

    it("updates an instance", async () => {
      await api.fs.writeTextFile(
        "project.json",
        JSON.stringify(configurationWithUpdatedInstance),
      );
      await action(options);

      const patches = api.jet.getConfigurationPatches(projectId);

      assertNotEquals(patches, undefined);
      assertEquals(patches!.length, 2);

      assertObjectMatch(patches![1], {
        capabilities: [],
        instances: [
          {
            action: "update",
            name: "tower",
            config: { pluginKey: "{{ NEW_PLUGIN_KEY }}" },
            capabilityNames: [],
          },
        ],
      });
    });

    it("removes the first instance", async () => {
      await api.fs.writeTextFile(
        "project.json",
        JSON.stringify(configurationWithRemovedInstance),
      );
      await action(options);

      const patches = api.jet.getConfigurationPatches(projectId);

      assertNotEquals(patches, undefined);
      assertEquals(patches!.length, 2);

      assertObjectMatch(patches![1], {
        capabilities: [],
        instances: [{ action: "delete", name: "tower" }],
      });
    });

    it("detects instance order change", async () => {
      await api.fs.writeTextFile(
        "project.json",
        JSON.stringify(configurationWithChangedOrder),
      );
      await action(options);

      const patches = api.jet.getConfigurationPatches(projectId);

      assertNotEquals(patches, undefined);
      assertEquals(patches!.length, 1);
      assertEquals(patches![1], undefined);
    });
  });

  describe("capabilities and capabilities patches", () => {
    async function getPatch(
      from: Record<string, unknown>,
      to: Record<string, unknown>,
    ) {
      await api.fs.writeTextFile(
        "project.json",
        JSON.stringify({
          name: "name",
          title: "title",
          instantiate: [],
          capabilities: [],
          runningWorkflows: {},
          ...from,
        }),
      );
      await action(options);

      await api.fs.writeTextFile(
        "project.json",
        JSON.stringify({
          name: "name",
          title: "title",
          instantiate: [],
          capabilities: [],
          runningWorkflows: {},
          ...to,
        }),
      );
      await action(options);

      const patches = api.jet.getConfigurationPatches(projectId);

      assertEquals(patches!.length, 2, "Expected 2 patches");

      return patches![1];
    }

    it("complex changes", async () => {
      const patch = await getPatch(
        {
          capabilities: [
            {
              name: "capability1",
              payload: { __type__: "database", schema: "schema1" },
            },
            {
              name: "capability2",
              payload: { __type__: "database", schema: "schema2" },
            },
          ],
          instances: [
            {
              capabilityNames: [],
              config: {},
              name: "plugina",
              pluginName: "pluginA",
            },
            {
              capabilityNames: [],
              config: { foo: "bar" },
              name: "pluginb",
              pluginName: "pluginB",
            },
            {
              capabilityNames: [],
              config: { foo: "bar" },
              name: "pluginc",
              pluginName: "pluginC",
            },
          ],
        },
        {
          capabilities: [
            {
              name: "capability2",
              payload: { __type__: "database", schema: "schema3" },
            },
          ],
          instances: [
            {
              capabilityNames: [],
              config: { foo: "bar" },
              name: "pluginc",
              pluginName: "pluginC",
            },
            {
              capabilityNames: [],
              config: { foo: "bar" },
              name: "plugind",
              pluginName: "pluginD",
            },
            {
              capabilityNames: [],
              config: { foo: "baz" },
              name: "pluginb",
              pluginName: "pluginB",
            },
          ],
        },
      );

      assertObjectMatch(patch, {
        capabilities: [
          {
            action: "delete",
            name: "capability1",
          },
          {
            action: "update",
            name: "capability2",
            payload: { __type__: "database", schema: "schema3" },
          },
        ],
        instances: [
          {
            action: "delete",
            name: "plugina",
          },
          {
            action: "update",
            capabilityNames: [],
            config: {
              foo: "baz",
            },
            name: "pluginb",
          },
          {
            action: "create",
            capabilityNames: [],
            config: {
              foo: "bar",
            },
            name: "plugind",
            pluginName: "pluginD",
          },
        ],
      });
    });
  });

  describe("entryFile", () => {
    const configuration = {
      name: "my_proj",
      title: "my_proj",
      capabilities: [],
      instances: [],
      runningWorkflows: {},
    };

    beforeEach(async () => {
    });

    it("works", async () => {
      const initial = { entryFile: "initial.js", ...configuration };
      await api.fs.writeTextFile("project.json", JSON.stringify(initial));
      await action(options);

      const initialPatches = api.jet.getConfigurationPatches(projectId);

      assertNotEquals(initialPatches, undefined);
      assertEquals(initialPatches!.length, 1);
      assertObjectMatch(initialPatches![0], { entryFile: "initial.js" });

      const updated = { entryFile: "updated.js", ...configuration };
      await api.fs.writeTextFile("project.json", JSON.stringify(updated));
      await action(options);

      const updatedPatches = api.jet.getConfigurationPatches(projectId);

      assertNotEquals(updatedPatches, undefined);
      assertEquals(updatedPatches!.length, 2);
      assertObjectMatch(updatedPatches![1], { entryFile: "updated.js" });
    });
  });
});
