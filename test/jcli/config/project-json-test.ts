import {
  assertEquals,
  assertNotEquals,
  assertObjectMatch,
  describe,
  it,
} from "@test/mod.ts";

import {
  ProjectCapability,
  ProjectImports,
  ProjectPluginInstance,
  ProjectScopes,
} from "@/jet/project.ts";

import { ProjectDotJSON } from "@/jcli/config/project-json.ts";

describe("ProjectDotJSON", () => {
  describe("diff", () => {
    const id = crypto.randomUUID();

    const build = (args: {
      name?: string;
      title?: string;
      capabilities?: Array<ProjectCapability>;
      instances?: Array<ProjectPluginInstance>;
      imports?: ProjectImports;
      scopes?: ProjectScopes;
    } = {}) => {
      return new ProjectDotJSON({
        id,
        name: args.name ?? "name",
        title: args.title ?? "title",
        capabilities: args.capabilities ?? [],
        instances: args.instances ?? [],
        imports: args.imports,
        scopes: args.scopes,
      });
    };

    it("diff name", () => {
      const one = build({ name: "foo" });
      const another = build({ name: "bar" });
      const diff = one.diff(another);

      assertNotEquals(diff, undefined);
      assertObjectMatch(diff!, {
        name: "bar",
        capabilities: [],
        instances: [],
      });
    });

    it("diff title", () => {
      const one = build({ title: "foo" });
      const another = build({ title: "bar" });
      const diff = one.diff(another);

      assertNotEquals(diff, undefined);
      assertObjectMatch(diff!, {
        title: "bar",
        capabilities: [],
        instances: [],
      });
    });

    describe("diff capabilities", () => {
      it("add capability", () => {
        const one = build();
        const another = build({
          capabilities: [{
            name: "cap",
            payload: { __type__: "database", schema: "schema" },
          }],
        });

        const diff = one.diff(another);
        assertEquals(diff.capabilities.length, 1);
        assertObjectMatch(diff.capabilities[0], {
          action: "CREATE",
          name: "cap",
          payload: { __type__: "database", schema: "schema" },
        });
      });

      it("delete capability", () => {
        const one = build({
          capabilities: [{
            name: "cap",
            payload: { __type__: "database", schema: "schema" },
          }],
        });
        const another = build();

        const diff = one.diff(another);
        assertEquals(diff.capabilities.length, 1);
        assertObjectMatch(diff.capabilities[0], {
          action: "DELETE",
          name: "cap",
        });
      });

      it("update capability", () => {
        const one = build({
          capabilities: [{
            name: "cap",
            payload: { __type__: "database", schema: "schema1" },
          }],
        });

        const another = build({
          capabilities: [{
            name: "cap",
            payload: { __type__: "database", schema: "schema2" },
          }],
        });

        const diff = one.diff(another);
        assertEquals(diff.capabilities.length, 1);
        assertObjectMatch(diff.capabilities[0], {
          action: "UPDATE",
          name: "cap",
          payload: { __type__: "database", schema: "schema2" },
        });
      });
    });

    describe("diff instances", () => {
      it("add instance", () => {
        const one = build();
        const another = build({
          instances: [
            {
              pluginName: "plugin",
              name: "instance",
              description: "description",
              config: { token: "token" },
              capabilityNames: ["cap"],
            },
          ],
        });

        const diff = one.diff(another);
        assertEquals(diff.instances.length, 1);
        assertObjectMatch(diff.instances[0], {
          action: "CREATE",
          pluginName: "plugin",
          name: "instance",
          description: "description",
          config: { token: "token" },
          capabilityNames: ["cap"],
        });
      });

      it("delete instance", () => {
        const one = build({
          instances: [
            {
              pluginName: "plugin",
              name: "instance",
              description: "description",
              config: { token: "token" },
              capabilityNames: ["cap"],
            },
          ],
        });
        const another = build();

        const diff = one.diff(another);
        assertEquals(diff.instances.length, 1);
        assertObjectMatch(diff.instances[0], {
          action: "DELETE",
          name: "instance",
        });
      });

      it("update instance", () => {
        const one = build({
          instances: [
            {
              pluginName: "plugin",
              name: "instance",
              description: "description",
              config: { token: "token" },
              capabilityNames: ["cap"],
            },
          ],
        });

        let another = build({
          instances: [
            {
              pluginName: "plugin",
              name: "instance",
              description: "description1",
              config: { token: "token" },
              capabilityNames: ["cap"],
            },
          ],
        });

        let diff = one.diff(another);

        assertEquals(diff.instances.length, 1);
        assertObjectMatch(diff.instances[0], {
          action: "UPDATE",
          name: "instance",
          description: "description1",
        });

        another = build({
          instances: [
            {
              pluginName: "plugin",
              name: "instance",
              description: "description",
              config: { token: "token1", anotherToken: "anotherToken" },
              capabilityNames: ["cap"],
            },
          ],
        });

        diff = one.diff(another);

        assertEquals(diff.instances.length, 1);
        assertObjectMatch(diff.instances[0], {
          action: "UPDATE",
          name: "instance",
          config: { token: "token1", anotherToken: "anotherToken" },
        });

        another = build({
          instances: [
            {
              pluginName: "plugin",
              name: "instance",
              description: "description",
              config: { token: "token" },
              capabilityNames: ["cap1", "cap2"],
            },
          ],
        });

        diff = one.diff(another);

        assertEquals(diff.instances.length, 1);
        assertObjectMatch(diff.instances[0], {
          action: "UPDATE",
          name: "instance",
          capabilityNames: ["cap1", "cap2"],
        });

        another = build({
          instances: [
            {
              pluginName: "plugin",
              name: "instance",
              description: "description2",
              config: { token: "token2" },
              capabilityNames: ["cap2", "cap1"],
            },
          ],
        });

        diff = one.diff(another);

        assertEquals(diff.instances.length, 1);
        assertObjectMatch(diff.instances[0], {
          action: "UPDATE",
          description: "description2",
          config: { token: "token2" },
          capabilityNames: ["cap2", "cap1"],
        });
      });
    });

    it("diff imports", () => {
      const initialImports = undefined;
      const updatedImports = { "lib": "v2" };
      const updatedImportsTwo = { "lib": "v2", "src": "./src" };

      // replace 从 undefined 到有值
      const one = build({ imports: initialImports });
      const another = build({ imports: updatedImports });
      const diff = one.diff(another);

      assertObjectMatch(diff!, {
        imports: updatedImports,
      });

      // add 从有 lib 到既含有 lib 又含有 src
      const anotherTwo = build({ imports: updatedImportsTwo });
      const diffTwo = one.diff(anotherTwo);
      assertEquals(diffTwo.imports, updatedImportsTwo);

      // remove 从既含有 lib 又含有 src 到只有 lib
      const anotherThree = build({ imports: updatedImports });
      const diffThree = anotherTwo.diff(anotherThree);
      assertEquals(diffThree.imports, updatedImports);

      //replace 从只有 lib 到 undefined
      const anotherFour = build({ imports: initialImports });
      const diffFour = anotherThree.diff(anotherFour);
      assertEquals(diffFour.imports, initialImports);
    });

    it("diff scopes", () => {
      const initialScopes = undefined;
      const updatedScopes = { "std": { "foo": "foo" } };
      const updatedScopesTwo = {
        "std": { "foo": "foo" },
        "dev": { "bar": "bar" },
      };

      // replace 从 undefined 到有值
      const one = build({ scopes: initialScopes });
      const another = build({ scopes: updatedScopes });
      const diff = one.diff(another);
      assertEquals(diff.scopes, updatedScopes);

      // add 从有 std 到既含有 std 又含有 dev
      const anotherTwo = build({ scopes: updatedScopesTwo });
      const diffTwo = one.diff(anotherTwo);
      assertEquals(diffTwo.scopes, updatedScopesTwo);

      // remove 从既含有 std 又含有 dev 到只有 std
      const anotherThree = build({ scopes: updatedScopes });
      const diffThree = anotherTwo.diff(anotherThree);
      assertEquals(diffThree.scopes, updatedScopes);

      // replace 从只有 std 到 undefined
      const anotherFour = build({ scopes: initialScopes });
      const diffFour = anotherThree.diff(anotherFour);
      assertEquals(diffFour.scopes, initialScopes);
    });
  });
});
