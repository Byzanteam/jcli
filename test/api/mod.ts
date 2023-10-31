import { APIClient } from "@/api/mod.ts";
import { FSTest, makeFS } from "@test/api/fs.ts";
import { JetTest, makeJet } from "@test/api/jet.ts";
import { ConfigBase } from "@/jcli/config/config.ts";

export * from "@test/api/fs.ts";
export * from "@test/api/jet.ts";

export interface APIClientTest extends APIClient {
  fs: FSTest;
  jet: JetTest;
}

export function makeAPIClient(): APIClientTest {
  const fs = makeFS();

  const Config = class<T> extends ConfigBase<T> {
    _fs = fs;
  };

  return {
    fs: fs,
    jet: makeJet(),
    Config: Config,
  };
}
