import { apply_patch as applyPatch } from "jsonpatch";

import {
  Project,
  ProjectCapability,
  ProjectPluginInstance,
} from "@/jet/project.ts";

import {
  ProjectCapabilityUpdatePatch,
  ProjectPatch,
  ProjectPluginInstanceUpdatePatch,
} from "@/jcli/config/project-json.ts";

import { diffApply } from "just-diff-apply";

type PathNode = string | number;

type DiffPatchOp = "add" | "replace" | "remove";

export interface DiffPatch {
  op: DiffPatchOp;
  path: ReadonlyArray<PathNode>;
  value: unknown;
}

export type ProjectJSON = Omit<Project, "id">;

type BuilderNodeFilter = (pathNode: PathNode) => boolean;

interface BuilderContext {
  dataWas: ProjectJSON;
  currentPathNode: PathNode;
  assigns: Map<string, unknown>;
  restPathNodes: ReadonlyArray<PathNode>;
}

type BuilderFn = (
  op: DiffPatchOp,
  value: unknown,
  patch: ProjectPatch,
  context: BuilderContext,
) => void;

/**
 * To run a BuilderNode, the path of a diffPatch must be perfect matched
 * a path of the BuilderNode tree.
 *
 * BuilderNodes on the path will not be executed. Only the leaf nodes will.
 * And if the execution process reached the leaf node and the path is not
 * all consumed, an error will be thrown.
 *
 * The `alwaysRun` option has different behaviours. A BuilderNode with
 * `aywaysRun` enabled will always be executed no matther whether it is a leaf
 * or the path is all consumed.
 */
class BuilderNode {
  #name: string;
  #alwaysRun: boolean;

  #filter: BuilderNodeFilter = function (_pathNode) {
    return true;
  };

  #builder: BuilderFn | undefined;

  #children: ReadonlyArray<BuilderNode> = [];

  constructor(options: { alwaysRun?: boolean; name: string }) {
    this.#alwaysRun = options.alwaysRun ?? false;
    this.#name = options.name;
  }

  on(fn: BuilderNodeFilter): BuilderNode {
    this.#filter = fn;
    return this;
  }

  do(fn: BuilderFn): BuilderNode {
    this.#builder = fn;
    return this;
  }

  children(children: ReadonlyArray<BuilderNode>): BuilderNode {
    this.#children = children;
    return this;
  }

  run(
    diffPatch: DiffPatch,
    patch: ProjectPatch,
    dataWas: ProjectJSON,
    currentPathNode: PathNode = "",
    assigns: Map<string, unknown> = new Map(),
  ) {
    if (0 === diffPatch.path.length || this.#alwaysRun) {
      this.#builder!(diffPatch.op, diffPatch.value, patch, {
        dataWas,
        currentPathNode,
        assigns,
        restPathNodes: diffPatch.path,
      });
    }

    if (
      !(this.#alwaysRun && 0 === this.#children.length) &&
      0 !== diffPatch.path.length
    ) {
      const [pathNode, ...path] = diffPatch.path;
      const child = this.#findChild(pathNode);

      child.run(
        { op: diffPatch.op, path, value: diffPatch.value },
        patch,
        dataWas,
        pathNode,
        assigns,
      );
    }
  }

  #findChild(pathNode: PathNode): BuilderNode {
    const child = this.#children.find((child) => child.#filter(pathNode));

    if (child) {
      return child;
    }

    throw new Error(
      `BuilderNode(${this.#name}) has no handler for '${pathNode}' node.\n` +
        `available nodes: ${this.#children.map((e) => e.#name).join(", ")}`,
    );
  }
}

function equal(value: PathNode): BuilderNodeFilter {
  return (pathNode) => pathNode === value;
}

function equalAny(value: ReadonlyArray<PathNode>): BuilderNodeFilter {
  return (pathNode) => value.includes(pathNode);
}

function isNumber(value: PathNode): value is number {
  return typeof value === "number";
}

function buildNamePatch(
  _op: DiffPatchOp,
  value: unknown,
  patch: ProjectPatch,
): void {
  /* op must be "replace" */
  patch.name = value as string;
}

function buildTitlePatch(
  _op: DiffPatchOp,
  value: unknown,
  patch: ProjectPatch,
): void {
  patch.title = value as string;
}

function buildCapabilitiesPatch(
  op: DiffPatchOp,
  value: unknown,
  patch: ProjectPatch,
  context: BuilderContext,
): void {
  if (0 === context.restPathNodes.length) {
    doBuildCapabilityPatch(op, value, patch, context);
  } else {
    const { dataWas: { capabilities }, currentPathNode, assigns } = context;
    const capability = capabilities[currentPathNode as number];

    if (patch.capabilities.every((e) => e.name !== capability.name)) {
      patch.capabilities.push({
        action: "update",
        name: capability.name,
        payload: capability.payload,
      });
    }

    assigns.set("capability", capability);
  }
}

function doBuildCapabilityPatch(
  op: DiffPatchOp,
  value: unknown,
  patch: ProjectPatch,
  context: BuilderContext,
): void {
  switch (op) {
    case "add": {
      const { name, payload } = value as ProjectCapability;
      patch.capabilities.push({ action: "create", name, payload });
      break;
    }

    case "remove": {
      const { dataWas: { capabilities }, currentPathNode } = context;
      patch.capabilities.push({
        action: "delete",
        name: capabilities[currentPathNode as number].name,
      });
    }
  }
}

function buildCapabilityPatch(
  op: DiffPatchOp,
  value: unknown,
  patch: ProjectPatch,
  context: BuilderContext,
): void {
  const capability = context.assigns.get("capability") as ProjectCapability;

  switch (context.currentPathNode) {
    case "payload": {
      const path = `/${context.restPathNodes.join("/")}`;
      updatePatch(
        patch.capabilities,
        (e) => e.name === capability.name,
        (e) => {
          const patch = e as ProjectCapabilityUpdatePatch;
          const payload = applyPatch(
            patch.payload ?? capability.payload,
            [{
              op,
              path,
              value,
            }],
          );
          patch.payload = payload;
        },
      );
      break;
    }

    default:
      break;
  }
}

function buildInstancesPatch(
  op: DiffPatchOp,
  value: unknown,
  patch: ProjectPatch,
  context: BuilderContext,
): void {
  if (0 === context.restPathNodes.length) {
    doBuildInstancesPatch(op, value, patch, context);
  } else {
    const { dataWas: { instances }, currentPathNode, assigns } = context;
    const instance = instances[currentPathNode as number];

    if (patch.instances.every((e) => e.name !== instance.name)) {
      patch.instances.push({ action: "update", name: instance.name });
    }

    assigns.set("instance", instance);
  }
}

function doBuildInstancesPatch(
  op: DiffPatchOp,
  value: unknown,
  patch: ProjectPatch,
  context: BuilderContext,
): void {
  switch (op) {
    case "add": {
      const { pluginName, name, description, config, capabilityNames } =
        value as ProjectPluginInstance;

      patch.instances.push({
        action: "create",
        pluginName,
        name,
        description,
        config,
        capabilityNames,
      });

      break;
    }

    case "remove": {
      const { dataWas: { instances }, currentPathNode } = context;
      patch.instances.push({
        action: "delete",
        name: instances[currentPathNode as number].name,
      });
    }
  }
}

function buildInstancePatch(
  op: DiffPatchOp,
  value: unknown,
  patch: ProjectPatch,
  context: BuilderContext,
): void {
  const instance = context.assigns.get("instance") as ProjectPluginInstance;

  switch (context.currentPathNode) {
    case "description": {
      updatePatch(
        patch.instances,
        (e) => e.name === instance.name,
        (p) =>
          (p as ProjectPluginInstanceUpdatePatch).description = value as string,
      );

      break;
    }

    case "config": {
      const path = `/${context.restPathNodes.join("/")}`;

      updatePatch(
        patch.instances,
        (e) => e.name === instance.name,
        (e) => {
          const patch = e as ProjectPluginInstanceUpdatePatch;
          const config = applyPatch(patch.config ?? instance.config, [{
            op,
            path,
            value,
          }]);
          patch.config = config;
        },
      );

      break;
    }

    case "capabilityNames": {
      const path = `/${context.restPathNodes.join("/")}`;

      updatePatch(
        patch.instances,
        (e) => e.name === instance.name,
        (e) => {
          const patch = e as ProjectPluginInstanceUpdatePatch;
          const capabilityNames = applyPatch(
            patch.capabilityNames ?? instance.capabilityNames,
            [{
              op,
              path,
              value,
            }],
          );
          patch.capabilityNames = capabilityNames;
        },
      );

      break;
    }
  }
}

function updatePatch<T>(
  patches: Array<T>,
  predicate: (value: T) => boolean,
  updater: (value: T) => void,
): void {
  const elem = patches.find((e) => predicate(e));

  if (undefined !== elem) {
    updater(elem);
  } else {
    throw new Error("Patch not found");
  }
}

function buildImportsPatch(
  op: DiffPatchOp,
  value: unknown,
  patch: ProjectPatch,
  context: BuilderContext,
): void {
  if (!patch.imports) patch.imports = { ...context.dataWas.imports };

  diffApply(patch, [
    { op, path: ["imports", ...context.restPathNodes] as string[], value },
  ]);
}

function buildScopesPatch(
  op: DiffPatchOp,
  value: unknown,
  patch: ProjectPatch,
  context: BuilderContext,
): void {
  if (!patch.scopes) patch.scopes = structuredClone(context.dataWas.scopes);

  diffApply(patch, [
    { op, path: ["scopes", ...context.restPathNodes] as string[], value },
  ]);
}

export const builder = new BuilderNode({ name: "root" }).children([
  new BuilderNode({ name: "name" }).on(equal("name")).do(buildNamePatch),
  new BuilderNode({ name: "title" }).on(equal("title")).do(buildTitlePatch),
  new BuilderNode({ name: "capabilities" }).on(equal("capabilities")).children([
    new BuilderNode({ name: "capabilities.item", alwaysRun: true }).on(isNumber)
      .do(buildCapabilitiesPatch)
      .children(
        [
          new BuilderNode({
            name: "capabilities.item.payload",
            alwaysRun: true,
          }).on(
            equal("payload"),
          ).do(
            buildCapabilityPatch,
          ),
        ],
      ),
  ]),
  new BuilderNode({ name: "instances" }).on(equal("instances")).children([
    new BuilderNode({ name: "instances.item", alwaysRun: true }).on(isNumber)
      .do(buildInstancesPatch)
      .children([
        new BuilderNode({ name: "instances.item.attributes", alwaysRun: true })
          .on(
            equalAny(["description", "config", "capabilityNames"]),
          ).do(buildInstancePatch),
      ]),
  ]),
  new BuilderNode({ name: "imports", alwaysRun: true }).on(equal("imports")).do(
    buildImportsPatch,
  ),
  new BuilderNode({ name: "scopes", alwaysRun: true }).on(equal("scopes")).do(
    buildScopesPatch,
  ),
]);
