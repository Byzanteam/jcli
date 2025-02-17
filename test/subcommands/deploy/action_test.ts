import { join } from "path";
import {
  afterEach,
  assertEquals,
  beforeEach,
  describe,
  it,
} from "@test/mod.ts";

import { PROJECT_ASSETS_DIRECTORY, setupAPI } from "@/api/mod.ts";

import { APIClientTest, makeAPIClient } from "@test/api/mod.ts";

import createProject from "@/subcommands/admin/projects/create/action.ts";
import push from "@/subcommands/push/action.ts";
import commit from "@/subcommands/commit/action.ts";
import action from "@/subcommands/deploy/action.ts";

describe("commit", () => {
  let api: APIClientTest;
  let projectId: string;

  const options = {};

  async function writeMigrationFile(
    name: string,
    content: string,
    create: boolean = true,
  ) {
    const file = join(PROJECT_ASSETS_DIRECTORY, "migrations", name);
    await api.fs.writeTextFile(file, content, { createNew: create });
  }

  beforeEach(async () => {
    api = makeAPIClient();
    setupAPI(api);

    await createProject({}, "my_proj");

    projectId = api.jet.getProject({ projectName: "my_proj" })!.id;

    api.chdir("my_proj");

    for (let i = 0; i < 3; i++) {
      writeMigrationFile(`20200000000${i}.sql`, i.toString());
    }

    await push({ include: ["migration"] });

    await commit({});
  });

  afterEach(() => {
    api.cleanup();
  });

  it("deploy latest version", async () => {
    await action(options);

    const deployRequests = api.jet.getDeployRequests(projectId)!;

    assertEquals(deployRequests.length, 1);
    assertEquals(deployRequests[0].commitId, undefined);
  });

  it("deploy given commit", async () => {
    const commitId = crypto.randomUUID();
    await action(options, commitId);

    const deployRequests = api.jet.getDeployRequests(projectId)!;

    assertEquals(deployRequests.length, 1);
    assertEquals(deployRequests[0].commitId, commitId);
  });
});
