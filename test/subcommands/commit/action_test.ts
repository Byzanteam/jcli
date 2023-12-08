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
import action from "@/subcommands/commit/action.ts";

describe("commit", () => {
  let api: APIClientTest;
  let projectId: string;

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");

    projectId = api.jet.getProject({ projectName: "my_proj" })!.id;

    api.chdir("my_proj");

    for (let i = 0; i < 3; i++) {
      api.fs.writeTextFile(`migrations/20200000000${i}.sql`, i.toString(), {
        createNew: true,
      });
    }

    await push({ onlyMigrations: true });
  });

  afterEach(() => {
    api.cleanup();
  });

  it("commit without message", async () => {
    await action({});

    const commitRequests = api.jet.getCommitRequests(projectId)!;

    assertEquals(commitRequests.length, 1);
    assertEquals(commitRequests[0].message, undefined);
  });

  it("commit with message", async () => {
    await action({ message: "commit message" });

    const commitRequests = api.jet.getCommitRequests(projectId)!;

    assertEquals(commitRequests.length, 1);
    assertEquals(commitRequests[0].message, "commit message");
  });
});
