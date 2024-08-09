import {
  Project,
  ProjectCapability,
  ProjectPluginInstance,
} from "@/jet/project.ts";

import {
  buildProjectJsonWithObjects,
  ProjectJsonWithObject,
  ProjectPatch,
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
  datawasWithObject: ProjectJsonWithObject;
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
        datawasWithObject: buildProjectJsonWithObjects(dataWas),
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

function buildCapabilitysPatch(
  op: DiffPatchOp,
  value: unknown,
  patch: ProjectPatch,
  context: BuilderContext,
): void {
  const { currentPathNode, restPathNodes } = context;

  if (0 === restPathNodes.length) {
    doBuildCapabilityPatch(op, value, patch, context);
  } else {
    diffApply(context.datawasWithObject.capabilities, [
      {
        op,
        path: [currentPathNode, ...restPathNodes] as string[],
        value,
      },
    ]);
    const currentCapability =
      context.datawasWithObject.capabilities[currentPathNode as string];

    const capabilityData = {
      name: currentPathNode as string,
      payload: currentCapability.payload,
    };

    const index = patch.capabilities.findIndex((cap) =>
      cap.name === currentPathNode
    );

    if (index === -1) {
      patch.capabilities.push({ action: "update", ...capabilityData });
    } else {
      patch.capabilities[index] = { action: "update", ...capabilityData };
    }
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
      const { currentPathNode } = context;
      patch.capabilities.push({
        action: "delete",
        name: currentPathNode as string,
      });
    }
  }
}

function buildInstancesPatch(
  op: DiffPatchOp,
  value: unknown,
  patch: ProjectPatch,
  context: BuilderContext,
) {
  const { currentPathNode, restPathNodes } = context;

  if (restPathNodes.length === 0) {
    doBuildInstancesPatch(op, value, patch, context);
  } else {
    diffApply(context.datawasWithObject.instances, [
      {
        op,
        path: [currentPathNode, ...restPathNodes] as string[],
        value,
      },
    ]);

    const currentInstance =
      context.datawasWithObject.instances[currentPathNode as string];

    const instanceData = {
      name: currentPathNode as string,
      description: currentInstance.description,
      config: currentInstance.config,
      capabilityNames: currentInstance.capabilityNames,
    };

    const index = patch.instances.findIndex((ins) =>
      ins.name === currentPathNode
    );

    if (index === -1) {
      patch.instances.push({ action: "update", ...instanceData });
    } else {
      patch.instances[index] = { action: "update", ...instanceData };
    }
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
      const { currentPathNode } = context;
      patch.instances.push({
        action: "delete",
        name: currentPathNode as string,
      });
    }
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
    new BuilderNode({ name: "capabilitie", alwaysRun: true }).do(
      buildCapabilitysPatch,
    ),
  ]),
  new BuilderNode({ name: "instances" }).on(equal("instances")).children([
    new BuilderNode({ name: "instance", alwaysRun: true }).do(
      buildInstancesPatch,
    ),
  ]),
  new BuilderNode({ name: "imports", alwaysRun: true }).on(equal("imports")).do(
    buildImportsPatch,
  ),
  new BuilderNode({ name: "scopes", alwaysRun: true }).on(equal("scopes")).do(
    buildScopesPatch,
  ),
]);
