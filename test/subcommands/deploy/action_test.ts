import {
  afterEach,
  assertEquals,
  beforeEach,
  describe,
  it,
} from "@test/mod.ts";

import { setupAPI } from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import push from "@/subcommands/push/action.ts";
import commit from "@/subcommands/commit/action.ts";
import action from "@/subcommands/deploy/action.ts";

describe("commit", () => {
  let api: APIClientTest;
  let projectUuid: string;

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");

    projectUuid = api.jet.getProject({ projectName: "my_proj" })!.id;

    api.chdir("my_proj");

    for (let i = 0; i < 3; i++) {
      api.fs.writeTextFile(`migrations/20200000000${i}.sql`, i.toString(), {
        createNew: true,
      });
    }

    await push({ onlyMigrations: true });

    await commit({});
  });

  afterEach(() => {
    api.cleanup();
  });

  it("deploy latest version", async () => {
    await action({});

    const deployRequests = api.jet.getDeployRequests(projectUuid)!;

    assertEquals(deployRequests.length, 1);
    assertEquals(deployRequests[0].commitId, undefined);
  });

  it("deploy given commit", async () => {
    const commitId = crypto.randomUUID();
    await action({ commit: commitId });

    const deployRequests = api.jet.getDeployRequests(projectUuid)!;

    assertEquals(deployRequests.length, 1);
    assertEquals(deployRequests[0].commitId, commitId);
  });
});
