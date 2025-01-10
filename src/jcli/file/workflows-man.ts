import { join } from "path";
import { PreparedQuery } from "sqlite";

import { api, DBClass, DirEntry, PROJECT_ASSETS_DIRECTORY } from "@/api/mod.ts";
import { digest } from "@/jcli/file/project.ts";
import { chunk } from "@/utility/async-iterable.ts";
import { WorkflowDraftWorkflow } from "@/jet/workflow.ts";

interface PushWorkflowsOptions {
  concurrency?: number;
}

interface PushWorkflowsQueries {
  upsertWorkflowQuery: PreparedQuery<
    never,
    never,
    { name: string; hash: string }
  >;
  deleteWorkflowQuery: PreparedQuery<never, never, { name: string }>;
  listWorkflowsQuery(): ReadonlyMap<string, string>;
  finalize(): void;
}

interface WorkflowCreated {
  type: "CREATED";
  name: string;
  params: string;
}

interface WorkflowUpdated {
  type: "UPDATED";
  name: string;
  params: string;
}

interface WorkflowDeleted {
  type: "DELETED";
  name: string;
}

type WorkflowChange = WorkflowCreated | WorkflowUpdated | WorkflowDeleted;

const BASE_PATH = "workflows";

function isJSONFile(file: DirEntry): boolean {
  return file.isFile && /\w+\.json$/i.test(file.name);
}

function readParams(directory: string, file: string): Promise<string> {
  return api.fs.readTextFile(join(directory, file));
}

export async function parseParams(
  params: string,
): Promise<WorkflowDraftWorkflow> {
  const { name, ...data } = JSON.parse(params);
  const hash = await digest(JSON.stringify(data));

  return { name, hash, data };
}

async function* diffWorkflows(
  listWorkflowsQuery: () => ReadonlyMap<string, string>,
): AsyncIterable<WorkflowChange> {
  const basePath = join(PROJECT_ASSETS_DIRECTORY, BASE_PATH);
  const directory = await api.fs.realPath(basePath);
  const remoteWorkflows = listWorkflowsQuery();
  const localNames = new Set<string>();

  for await (const file of api.fs.readDir(directory)) {
    if (isJSONFile(file)) {
      const params = await readParams(directory, file.name);
      const { name, hash } = await parseParams(params);

      if (remoteWorkflows.has(name) && remoteWorkflows.get(name) !== hash) {
        yield { type: "UPDATED", name, params };
      } else {
        yield { type: "CREATED", name, params };
      }

      localNames.add(name);
    }
  }

  for (const name of remoteWorkflows.keys()) {
    if (!localNames.has(name)) {
      yield { type: "DELETED", name };
    }
  }
}

async function pushWorkflow(
  change: WorkflowChange,
  queries: PushWorkflowsQueries,
  projectId: string,
): Promise<void> {
  let hash: string;

  switch (change.type) {
    case "CREATED":
      hash = await api.jet.upsertWorkflow({
        projectId,
        params: change.params,
      });
      queries.upsertWorkflowQuery.execute({ name: change.name, hash });
      break;
    case "UPDATED":
      hash = await api.jet.upsertWorkflow({
        projectId,
        params: change.params,
      });
      queries.upsertWorkflowQuery.execute({ name: change.name, hash });
      break;
    case "DELETED":
      await api.jet.deleteWorkflow({ projectId, name: change.name });
      queries.deleteWorkflowQuery.execute({ name: change.name });
      break;
    default:
      break;
  }
}

export function prepareQueries(db: DBClass): PushWorkflowsQueries {
  const upsertWorkflowQuery = db.prepareQuery<
    never,
    never,
    { name: string; hash: string }
  >(
    "INSERT INTO workflows (name, hash) VALUES (:name, :hash) ON CONFLICT (name) DO UPDATE SET hash = :hash",
  );

  const deleteWorkflowQuery = db.prepareQuery<never, never, { name: string }>(
    "DELETE FROM workflows WHERE name = :name",
  );

  function listWorkflowsQuery(): ReadonlyMap<string, string> {
    return db
      .queryEntries<{ name: string; hash: string }>(
        "SELECT name, hash FROM workflows",
      )
      .reduce(
        (acc, row) => acc.set(row.name, row.hash),
        new Map<string, string>(),
      );
  }

  return {
    upsertWorkflowQuery,
    deleteWorkflowQuery,
    listWorkflowsQuery,
    finalize() {
      upsertWorkflowQuery.finalize();
      deleteWorkflowQuery.finalize();
    },
  };
}

export async function pushWorkflows(
  queries: PushWorkflowsQueries,
  projectId: string,
  options?: PushWorkflowsOptions,
): Promise<void> {
  const changes = diffWorkflows(queries.listWorkflowsQuery);
  const concurrency = options?.concurrency ?? navigator.hardwareConcurrency;

  for await (const items of chunk(changes, concurrency)) {
    await Promise.allSettled(
      items.map((item) => pushWorkflow(item, queries, projectId)),
    );
  }
}
