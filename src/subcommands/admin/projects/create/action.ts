import { GlobalOptions } from "@/args.ts";

import { api, PROJECT_DB_PATH } from "@/api/mod.ts";
import { createMetadataQuery } from "@/api/db/queries/create-metadata.ts";
import { createTableObjectsQuery } from "@/api/db/queries/create-table-objects.ts";
import { createFunctionsQuery } from "@/api/db/queries/create-functions.ts";
import { createConfigurationQuery } from "@/api/db/queries/create-configuration.ts";

import { Config } from "@/jcli/config/config.ts";
import {
  ProjectDotJSON,
  projectDotJSONPath,
} from "@/jcli/config/project-json.ts";

const PROJECT_NAME_FORMAT = /^[a-z_][a-z0-9_]{0,39}$/;

function validateProjectName(projectName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (PROJECT_NAME_FORMAT.test(projectName)) {
      resolve(projectName);
    } else {
      reject(invalidProjectNameError(projectName));
    }
  });
}

function invalidProjectNameError(projectName: string): Error {
  return new Error(
    `Invalid project name. Expected a lowercase alphanumeric string with optional underscores and a max length of 40, got "${projectName}".`,
  );
}

export default async function (
  _options: GlobalOptions,
  rawProjectName: string,
) {
  const projectName = await validateProjectName(rawProjectName);

  api.console.log("Creating project in Jet...");
  const project = await api.jet.createProject({
    name: projectName,
    title: projectName,
  });

  api.console.log("Provisioning local files...");
  await api.fs.mkdir(projectName);
  await api.fs.mkdir(`${projectName}/migrations`);
  await api.fs.mkdir(`${projectName}/functions`);
  await api.fs.mkdir(`${projectName}/.jcli`);

  const projectDotJSON = new Config<ProjectDotJSON>(
    projectDotJSONPath(projectName),
  );

  await projectDotJSON.set(new ProjectDotJSON(project), { createNew: true });

  const db = api.db.createDatabase(`${projectName}/${PROJECT_DB_PATH}`);

  db.execute(createMetadataQuery);
  db.query("INSERT INTO metadata (project_id) VALUES (:projectId)", {
    projectId: project.id,
  });

  db.execute(createTableObjectsQuery);
  db.execute(createFunctionsQuery);
  db.execute(createConfigurationQuery);

  db.query<never>("INSERT INTO configuration (data) VALUES (:data);", {
    data: JSON.stringify(await projectDotJSON.get()),
  });

  db.close();
}
