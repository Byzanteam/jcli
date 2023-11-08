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

class BuilderNode {
  #alwaysRun: boolean;

  #filter: BuilderNodeFilter = function (_pathNode) {
    return true;
  };

  #builder: BuilderFn | undefined;

  #children: ReadonlyArray<BuilderNode> = [];

  constructor(options?: { alwaysRun?: boolean }) {
    this.#alwaysRun = options?.alwaysRun ?? false;
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

    throw new Error(`PathNode ${pathNode} has no handler.`);
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
        action: "UPDATE",
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
      patch.capabilities.push({ action: "CREATE", name, payload });
      break;
    }

    case "remove": {
      const { dataWas: { capabilities }, currentPathNode } = context;
      patch.capabilities.push({
        action: "DELETE",
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
      patch.instances.push({ action: "UPDATE", name: instance.name });
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
        action: "CREATE",
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
        action: "DELETE",
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

export const builder = new BuilderNode().children([
  new BuilderNode().on(equal("name")).do(buildNamePatch),
  new BuilderNode().on(equal("title")).do(buildTitlePatch),
  new BuilderNode().on(equal("capabilities")).children([
    new BuilderNode({ alwaysRun: true }).on(isNumber).do(buildCapabilitiesPatch)
      .children(
        [
          new BuilderNode({ alwaysRun: true }).on(equal("payload")).do(
            buildCapabilityPatch,
          ),
        ],
      ),
  ]),
  new BuilderNode().on(equal("instances")).children([
    new BuilderNode({ alwaysRun: true }).on(isNumber).do(buildInstancesPatch)
      .children([
        new BuilderNode({ alwaysRun: true }).on(
          equalAny(["description", "config", "capabilityNames"]),
        ).do(buildInstancePatch),
      ]),
  ]),
]);
