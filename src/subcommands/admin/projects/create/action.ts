import { GlobalOptions } from "@/args.ts";
import { api } from "@/api/mod.ts";
import { ProjectDotJSON } from "@/jcli/config/project-json.ts";
import { ProjectBuilder } from "@/jcli/project-builder.ts";

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

  const builder = new ProjectBuilder(new ProjectDotJSON(project));

  api.console.log("Provisioning local files...");
  await builder.provisionFiles();

  builder.provisionDatabases();
  await builder.buildMetadata(project.id);
}
