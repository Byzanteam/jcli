import { APIClient } from "@/api/mod.ts";
import { DBTest, makeDB } from "@test/api/db.ts";
import { FSTest, makeFS } from "@test/api/fs.ts";
import { JetTest, makeJet } from "@test/api/jet.ts";

export * from "@test/api/db.ts";
export * from "@test/api/fs.ts";
export * from "@test/api/jet.ts";

export interface APIClientTest extends APIClient {
  db: DBTest;
  fs: FSTest;
  jet: JetTest;
  cleanup(): void;
}

export function makeAPIClient(): APIClientTest {
  const db = makeDB();
  const fs = makeFS();

  return {
    db: db,
    fs,
    jet: makeJet(),
    cleanup() {
      db.cleanup();
    },
  };
}
