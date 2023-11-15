import { DBClass } from "@/api/db.ts";

import { MigrationFileEntry } from "./migrations-man.ts";
import { digest as doDigest } from "@/jcli/crypto.ts";

import { join } from "path";

const encoder = new TextEncoder();

function digest(data: string): Promise<string> {
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
    const version = await new MigrationFileEntry(e.path).version();
    digests.push(await digest(`${version}${e.hash}`));
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

    if (!functionFileHashes.has(functionName)) {
      functionFileHashes.set(functionName, []);
    }

    functionFileHashes.get(functionName)!.push(
      await digestFunction(relativePath, e.hash),
    );
  }

  const functionHashes: Array<string> = [];

  for (const [functionName, hashes] of functionFileHashes) {
    functionHashes.push(
      await digest(`${functionName}${composeDigests(hashes)}`),
    );
  }

  return composeDigests(functionHashes);
}

function digestFunction(
  relativePath: ReadonlyArray<string>,
  hash: string,
): Promise<string> {
  return digest(`${join("/", ...relativePath)}${hash}`);
}

export async function digestProject(db: DBClass): Promise<string> {
  const migrationsHash = await digestMigrations(db);
  const functionsHash = await digestFunctions(db);

  return digest(`${migrationsHash}${functionsHash}`);
}
