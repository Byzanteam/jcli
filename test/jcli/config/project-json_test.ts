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
          action: "create",
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
          action: "delete",
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
          action: "update",
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
          action: "create",
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
          action: "delete",
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
          action: "update",
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
          action: "update",
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
          action: "update",
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
          action: "update",
          description: "description2",
          config: { token: "token2" },
          capabilityNames: ["cap2", "cap1"],
        });
      });
    });

    describe("Differences in imports", () => {
      it("should identify a replace update from undefined to defined values", () => {
        const initialConfig = build({ imports: undefined });
        const updatedConfig = build({
          imports: { "#functions": "./functions" },
        });
        const resultDiff = initialConfig.diff(updatedConfig);

        assertEquals(resultDiff.imports, { "#functions": "./functions" });
        assertEquals(initialConfig.toJSON().imports, undefined);
        assertEquals(updatedConfig.toJSON().imports, {
          "#functions": "./functions",
        });
      });

      it("should recognize adding new imports to existing ones", () => {
        const initialConfig = build({ imports: { "#utils": "./utils" } });
        const updatedConfig = build({
          imports: {
            "#utils": "./utils",
            "#functions": "./functions",
            "src": "./src",
          },
        });
        const resultDiff = initialConfig.diff(updatedConfig);

        assertEquals(resultDiff.imports, {
          "#utils": "./utils",
          "#functions": "./functions",
          "src": "./src",
        });
        assertEquals(initialConfig.toJSON().imports, { "#utils": "./utils" });
      });

      it("should detect removal of imports", () => {
        const initialConfig = build({
          imports: { "#functions": "./functions", "src": "./src" },
        });
        const reducedConfig = build({
          imports: { "#functions": "./functions" },
        });
        const resultDiff = initialConfig.diff(reducedConfig);

        assertEquals(resultDiff.imports, { "#functions": "./functions" });
        assertEquals(initialConfig.toJSON().imports, {
          "#functions": "./functions",
          "src": "./src",
        });
      });

      it("should detect a replace update from having only lib to no imports", () => {
        const initialConfig = build({
          imports: { "#functions": "./functions" },
        });
        const updatedConfig = build({ imports: undefined });
        const resultDiff = initialConfig.diff(updatedConfig);

        assertEquals(resultDiff.imports, undefined);
        assertEquals(initialConfig.toJSON().imports, {
          "#functions": "./functions",
        });
      });

      it("should identify updates with version and key changes in imports", () => {
        const initialConfig = build({
          imports: {
            "@std/foo": "jsr:@std/foo@^1.2.3",
          },
        });
        const newConfig = build({
          imports: {
            "@std/foo": "jsr:@std/foo@^2.0.0",
          },
        });
        const resultDiff = initialConfig.diff(newConfig);

        assertEquals(resultDiff.imports, {
          "@std/foo": "jsr:@std/foo@^2.0.0",
        });
        assertEquals(initialConfig.toJSON().imports, {
          "@std/foo": "jsr:@std/foo@^1.2.3",
        });
      });

      it("should accurately track multiple sequential modifications to imports", () => {
        const initialConfig = build({
          imports: {
            "#utils": "./utils",
            "#functions": "./functions",
          },
        });

        // 第一次修改：更新和添加新导入
        const firstUpdateConfig = build({
          imports: {
            "#utils": "./new_utils", // 更新路径
            "#functions": "./functions",
            "#extra": "./extra", // 新增
          },
        });

        // 第二次修改：删除部分导入并再次更新
        const secondUpdateConfig = build({
          imports: {
            "#utils": "./newer_utils",
            "#extra": "./extra",
          },
        });

        // 对第一次修改进行差异检查
        const firstDiff = initialConfig.diff(firstUpdateConfig);
        assertEquals(firstDiff.imports, {
          "#utils": "./new_utils",
          "#functions": "./functions",
          "#extra": "./extra",
        });

        // 对第二次修改进行差异检查
        const secondDiff = firstUpdateConfig.diff(secondUpdateConfig);
        assertEquals(secondDiff.imports, {
          "#utils": "./newer_utils",
          "#extra": "./extra",
        });

        // 最终配置校验

        assertEquals(secondUpdateConfig.toJSON().imports, {
          "#utils": "./newer_utils",
          "#extra": "./extra",
        });
      });
    });

    describe("Differences in scopes", () => {
      it("should identify a replace update from undefined to having values", () => {
        const initialConfig = build({ scopes: undefined });
        const updatedConfig = build({
          scopes: {
            "https://deno.land/x/example/": {
              "@std/foo": "./patched/mod.ts",
            },
          },
        });
        const resultDiff = initialConfig.diff(updatedConfig);

        assertEquals(resultDiff.scopes, {
          "https://deno.land/x/example/": {
            "@std/foo": "./patched/mod.ts",
          },
        });
        assertEquals(initialConfig.toJSON().scopes, undefined);
      });

      it("should identify an add update from having one scope to multiple scopes", () => {
        const initialConfig = build({
          scopes: {
            "https://deno.land/x/example/": {
              "@std/foo": "./patched/mod.ts",
            },
          },
        });

        const updatedConfig = build({
          scopes: {
            "https://deno.land/x/example/": {
              "@std/foo": "./patched/mod.ts",
            },
            "https://deno.land/x/another/": {
              "@std/bar": "./new/mod.ts",
            },
          },
        });
        const resultDiff = initialConfig.diff(updatedConfig);

        assertEquals(resultDiff.scopes, {
          "https://deno.land/x/example/": {
            "@std/foo": "./patched/mod.ts",
          },
          "https://deno.land/x/another/": {
            "@std/bar": "./new/mod.ts",
          },
        });

        assertEquals(initialConfig.toJSON().scopes, {
          "https://deno.land/x/example/": {
            "@std/foo": "./patched/mod.ts",
          },
        });
      });

      it("should identify a remove update from having multiple scopes to a single scope", () => {
        const fullScopeConfig = build({
          scopes: {
            "https://deno.land/x/example/": {
              "@std/foo": "./patched/mod.ts",
            },
            "https://deno.land/x/another/": {
              "@std/bar": "./new/mod.ts",
            },
          },
        });
        const reducedScopeConfig = build({
          scopes: {
            "https://deno.land/x/example/": {
              "@std/foo": "./patched/mod.ts",
            },
          },
        });
        const resultDiff = fullScopeConfig.diff(reducedScopeConfig);

        assertEquals(resultDiff.scopes, {
          "https://deno.land/x/example/": {
            "@std/foo": "./patched/mod.ts",
          },
        });
        assertEquals(fullScopeConfig.toJSON().scopes, {
          "https://deno.land/x/example/": {
            "@std/foo": "./patched/mod.ts",
          },
          "https://deno.land/x/another/": {
            "@std/bar": "./new/mod.ts",
          },
        });
      });

      it("should recognize a replace update from having scopes to no scopes", () => {
        const definedScopeConfig = build({
          scopes: {
            "https://deno.land/x/example/": {
              "@std/foo": "./patched/mod.ts",
            },
          },
        });
        const undefinedScopeConfig = build({ scopes: undefined });
        const resultDiff = definedScopeConfig.diff(undefinedScopeConfig);

        assertEquals(resultDiff.scopes, undefined);
        assertEquals(definedScopeConfig.toJSON().scopes, {
          "https://deno.land/x/example/": {
            "@std/foo": "./patched/mod.ts",
          },
        });
      });

      it("should detect changes in nested properties of scopes", () => {
        const oldConfig = build({
          scopes: {
            "https://deno.land/x/example/": {
              "@std/foo": "v1",
            },
          },
        });
        const newConfig = build({
          scopes: {
            "https://deno.land/x/example/": {
              "@std/foo": "v2",
            },
          },
        });
        const resultDiff = oldConfig.diff(newConfig);

        assertEquals(resultDiff.scopes, {
          "https://deno.land/x/example/": {
            "@std/foo": "v2",
          },
        });
        assertEquals(oldConfig.toJSON().scopes, {
          "https://deno.land/x/example/": {
            "@std/foo": "v1",
          },
        });
      });

      it("should accurately track consecutive modifications to scopes", () => {
        const initialConfig = build({
          scopes: {
            "https://deno.land/x/example/": {
              "@std/foo": "v1",
            },
            "https://deno.land/x/another/": {
              "@std/bar": "./stable/mod.ts",
            },
          },
        });

        // 第一次修改：更新和添加
        const firstUpdateConfig = build({
          scopes: {
            "https://deno.land/x/example/": {
              "@std/foo": "v2",
            },
            "https://deno.land/x/another/": {
              "@std/bar": "./stable/mod.ts",
              "@std/new": "./new/mod.ts", // 新增
            },
          },
        });

        // 第二次修改：删除和更新
        const secondUpdateConfig = build({
          scopes: {
            "https://deno.land/x/example/": { // 此作用域被完全更换
              "@std/foo": "v3",
            },
          },
        });

        // 对第一次修改进行差异检查
        const firstDiff = initialConfig.diff(firstUpdateConfig);

        assertEquals(firstDiff.scopes, {
          "https://deno.land/x/example/": { "@std/foo": "v2" },
          "https://deno.land/x/another/": {
            "@std/bar": "./stable/mod.ts",
            "@std/new": "./new/mod.ts",
          },
        });

        // 对第二次修改进行差异检查
        const secondDiff = firstUpdateConfig.diff(secondUpdateConfig);
        assertEquals(secondDiff.scopes, {
          "https://deno.land/x/example/": {
            "@std/foo": "v3",
          },
        });

        // 最终检查所有修改
        assertEquals(secondUpdateConfig.toJSON().scopes, {
          "https://deno.land/x/example/": {
            "@std/foo": "v3",
          },
        });
      });
    });
  });
});
