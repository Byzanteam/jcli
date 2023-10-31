import { GlobalOptions } from "@/args.ts";

import { APIClient } from "@/api/mod.ts";
import { createTableFileHashesQuery } from "@/api/db/queries/create-table-file-hashes.ts";

import {
  ProjectDotJSON,
  projectDotJSONPath,
} from "@/jcli/config/project-json.ts";
import {
  MetadataDotJSON,
  metadataDotJSONPath,
} from "@/jcli/config/metadata-json.ts";

const projectNameFormat = /^[a-z_][a-z0-9_]{0,39}$/;

function validateProjectName(projectName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (projectNameFormat.test(projectName)) {
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

export default function (api: APIClient) {
  return async function (_options: GlobalOptions, rawProjectName: string) {
    const projectName = await validateProjectName(rawProjectName);

    console.log("Creating project in Jet...");
    const project = await api.jet.createProject({
      name: projectName,
      title: projectName,
    });

    console.info("Provisioning local files...");
    await api.fs.mkdir(projectName);
    await api.fs.mkdir(`${projectName}/migrations`);
    await api.fs.mkdir(`${projectName}/functions`);
    await api.fs.mkdir(`${projectName}/.jcli`);

    const projectDotJSON = new api.Config(projectDotJSONPath(projectName));

    await projectDotJSON.set(new ProjectDotJSON(project), { createNew: true });

    const metadataDotJSON = new api.Config<MetadataDotJSON>(
      metadataDotJSONPath(projectName),
    );

    await metadataDotJSON.set({ projectId: project.id }, { createNew: true });

    const db = api.db.createDatabase(`${projectName}/.jcli/project.sqlite`);
    db.execute(createTableFileHashesQuery);

    db.close();
  };
}
