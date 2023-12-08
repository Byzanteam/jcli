import { api, DBClass } from "@/api/mod.ts";

import { MigrationFileEntry } from "./migrations-man.ts";
import { FunctionFileEntry } from "./functions-man.ts";
import { digest as doDigest } from "@/jcli/crypto.ts";

import { join } from "path";

const encoder = new TextEncoder();

export function digest(data: string): Promise<string> {
  return doDigest(encoder.encode(data));
}

function composeDigests(digests: ReadonlyArray<string>): Promise<string> {
  return digest(digests.toSorted().join(""));
}

async function digestMigrations(db: DBClass): Promise<string> {
  const entries = db.queryEntries<{ path: string; hash: string }>(
    "SELECT path, hash FROM objects WHERE filetype = 'MIGRATION'",
  );

  const digests: Array<string> = [];

  for (const e of entries) {
    const entry = new MigrationFileEntry(e.path);
    const content = await entry.content();

    digests.push(await digest(`${entry.version}${entry.name}${content}`));
  }

  return composeDigests(digests);
}

async function digestFunctions(db: DBClass): Promise<string> {
  const entries = db.queryEntries<{ path: string; hash: string }>(
    "SELECT path, hash FROM objects WHERE filetype = 'FUNCTION'",
  );

  const functionFileHashes = new Map<string, Array<string>>();

  for (const e of entries) {
    const [, functionName, ...relativePath] = e.path.split("/");
    const FileEntryConstructor = FunctionFileEntry(functionName);

    if (!functionFileHashes.has(functionName)) {
      functionFileHashes.set(functionName, []);
    }

    const entry = new FileEntryConstructor(join(...relativePath));

    functionFileHashes.get(functionName)!.push(
      await digestFunctionFile(relativePath, await entry.content()),
    );
  }

  const functionHashes: Array<string> = [];

  for (const hashes of functionFileHashes.values()) {
    functionHashes.push(await composeDigests(hashes));
  }

  return composeDigests(functionHashes);
}

function digestFunctionFile(
  relativePath: ReadonlyArray<string>,
  content: string,
): Promise<string> {
  return digest(`${join("/", ...relativePath)}${content}`);
}

function getConfiguration(db: DBClass): string {
  const [{ data: configuration }] = db.queryEntries<{ data: string }>(
    "SELECT data FROM configuration",
  );

  return configuration;
}

export async function digestProject(db: DBClass): Promise<string> {
  const configurationHash = await api.jet.configurationHash({
    configuration: getConfiguration(db),
  });
  const migrationsHash = await digestMigrations(db);
  const functionsHash = await digestFunctions(db);

  return composeDigests([configurationHash, migrationsHash, functionsHash]);
}
