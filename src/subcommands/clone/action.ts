import { GlobalOptions } from "@/args.ts";
import { api } from "@/api/mod.ts";
import { ProjectBuilder } from "@/jcli/project-builder.ts";

export default async function action(
  _options: GlobalOptions,
  projectId: string,
) {
  const project = await api.jet.cloneProject({ projectId });
  const builder = new ProjectBuilder(project.configuration);

  await builder.provisionFiles();
  builder.provisionDatabases();
  builder.buildMetadata(projectId);
  await builder.buildFunctions(project.functions);
  await builder.buildMigrations(project.migrations);
}
