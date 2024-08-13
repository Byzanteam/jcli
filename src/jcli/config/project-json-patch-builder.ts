import { Project } from "@/jet/project.ts";

import {
  ProjectJsonForDiff,
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
  dataWas: ProjectJsonForDiff;
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
    dataWas: ProjectJsonForDiff,
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

function buildObjectLikePatch<P extends "capabilities" | "instances">(
  property: P,
  op: DiffPatchOp,
  value: unknown,
  patch: ProjectPatch,
  context: BuilderContext,
): void {
  type Item = ProjectPatch[P][number];
  const container = patch[property] as Array<Item>;

  function getCurrent(defaultValue: () => Item): Item;
  function getCurrent(): Item | undefined;
  function getCurrent(defaultValue?: () => Item): Item | undefined {
    let current = container.find((item) =>
      item.name === currentPathNode as string
    );

    if (!current) {
      if (!defaultValue) {
        return;
      }

      current = defaultValue();
      container.push(current);
    }

    return current;
  }

  const { currentPathNode, restPathNodes } = context;

  if (restPathNodes.length === 0) {
    // the op is on a capability or instance

    switch (op) {
      case "add": {
        if (getCurrent()) {
          throw new Error(`Duplicate ${currentPathNode} in ${property}`);
        }

        type Value = Omit<Item, "action">;
        const item = { action: "create" as const, ...value as Value } as Item;

        container.push(item);

        break;
      }

      case "replace": {
        const current = getCurrent(() => ({
          action: "update",
          ...(structuredClone(
            context.dataWas[property][currentPathNode as string],
          )),
        }));

        diffApply(current, [
          {
            op,
            path: [...restPathNodes],
            value,
          },
        ]);

        break;
      }

      case "remove": {
        container.push({
          action: "delete",
          name: currentPathNode as string,
        });

        break;
      }
    }
  } else {
    // the op is on a property of a capability or instance

    const current = getCurrent(() => ({
      action: "update",
      ...(structuredClone(
        context.dataWas[property][currentPathNode as string],
      )),
    }));

    diffApply(current, [
      {
        op,
        path: [...restPathNodes],
        value,
      },
    ]);
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
      buildObjectLikePatch.bind(null, "capabilities"),
    ),
  ]),
  new BuilderNode({ name: "instances" }).on(equal("instances")).children([
    new BuilderNode({ name: "instance", alwaysRun: true }).do(
      buildObjectLikePatch.bind(null, "instances"),
    ),
  ]),
  new BuilderNode({ name: "imports", alwaysRun: true }).on(equal("imports")).do(
    buildImportsPatch,
  ),
  new BuilderNode({ name: "scopes", alwaysRun: true }).on(equal("scopes")).do(
    buildScopesPatch,
  ),
]);
