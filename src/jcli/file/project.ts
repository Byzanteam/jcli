import { api, DBClass } from "@/api/mod.ts";

import { digest as doDigest } from "@/jcli/crypto.ts";

const encoder = new TextEncoder();

export function digest(data: string): Promise<string> {
  return doDigest(encoder.encode(data));
}

function composeDigests(digests: ReadonlyArray<string>): Promise<string> {
  return digest(digests.toSorted().join(""));
}

async function digestFunctions(db: DBClass): Promise<string> {
  const entries = db.queryEntries<{ path: string; hash: string }>(
    "SELECT path, hash FROM objects WHERE filetype = 'FUNCTION'",
  );

  const functionFileHashes = new Map<string, Array<string>>();

  for (const e of entries) {
    const [, functionName] = e.path.split("/");

    if (!functionFileHashes.has(functionName)) {
      functionFileHashes.set(functionName, []);
    }

    functionFileHashes.get(functionName)!.push(e.hash);
  }

  const functionHashes: Array<string> = [];

  for (const hashes of functionFileHashes.values()) {
    functionHashes.push(await composeDigests(hashes));
  }

  return composeDigests(functionHashes);
}

function digestMigrations(db: DBClass): Promise<string> {
  const entries = db.queryEntries<{ hash: string }>(
    "SELECT path, hash FROM objects WHERE filetype = 'MIGRATION'",
  );

  return composeDigests(entries.map((e) => e.hash));
}

function digestWorkflows(db: DBClass): Promise<string> {
  const entries = db.queryEntries<{ name: string; hash: string }>(
    "SELECT name, hash FROM workflows",
  );
  const hashes = entries.map((entry) => entry.hash);

  return composeDigests(hashes);
}

function getConfiguration(db: DBClass): string {
  const [{ data: configuration }] = db.queryEntries<{ data: string }>(
    "SELECT data FROM configuration",
  );

  const { name, title, capabilities, instances, imports, scopes } = JSON.parse(
    configuration,
  );

  return JSON.stringify({
    name,
    title,
    capabilities,
    instances,
    imports,
    scopes,
  });
}

export async function digestProject(db: DBClass): Promise<string> {
  const configurationHash = await api.jet.configurationHash({
    configuration: getConfiguration(db),
  });
  const functionsHash = await digestFunctions(db);
  const migrationsHash = await digestMigrations(db);
  const workflowsHash = await digestWorkflows(db);

  return composeDigests([
    configurationHash,
    functionsHash,
    migrationsHash,
    workflowsHash,
  ]);
}
