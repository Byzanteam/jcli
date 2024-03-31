import { GlobalOptions } from "@/args.ts";
import { api } from "@/api/mod.ts";
import { ProjectBuilder } from "@/jcli/project-builder.ts";
import { projectLink } from "@/jcli/project-link.ts";

export default async function action(
  _options: GlobalOptions,
  projectId: string,
  directory = ".jcli-tmp",
) {
  const project = await api.jet.cloneProject({ projectId });
  const builder = new ProjectBuilder(project.configuration, { directory });

  await builder.provisionFiles();
  builder.provisionDatabases();
  builder.buildMetadata(projectId);
  await builder.buildFunctions(project.functions);
  await builder.buildMigrations(project.migrations);
  await projectLink(directory);
}
