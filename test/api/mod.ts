import { APIClient } from "@/api/mod.ts";

import {
  ConsoleTest,
  makeConsole,
  MakeConsoleOptions,
} from "@test/api/console.ts";
import { DBTest, makeDB } from "@test/api/db.ts";
import { FSTest, makeFS } from "@test/api/fs.ts";
import { JetTest, makeJet } from "@test/api/jet.ts";

export * from "@test/api/db.ts";
export * from "@test/api/fs.ts";
export * from "@test/api/jet.ts";

export interface APIClientTest extends APIClient {
  console: ConsoleTest;
  db: DBTest;
  fs: FSTest;
  jet: JetTest;
  chdir(path: string): void;
  cleanup(): void;
}

export interface MakeAPIClientOptions {
  console?: MakeConsoleOptions;
}

export function makeAPIClient(
  options: MakeAPIClientOptions = {},
): APIClientTest {
  const db = makeDB();
  const fs = makeFS();

  return {
    console: makeConsole(options.console),
    db: db,
    fs,
    jet: makeJet(),
    chdir(path: string) {
      db.chdir(path);
      fs.chdir(path);
    },
    cleanup() {
      db.cleanup();
    },
  };
}
