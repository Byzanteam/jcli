import { Project } from "@/jet/project.ts";
import { createProject as doCreateProject } from "@/api/jet/mod.ts";
import { JcliConfigDotJSON } from "@/jcli/config/jcli-config-json.ts";
import { getLogger } from "@/jcli/logger.ts";

export interface CreateProjectArgs {
  name: string;
  title: string;
}

export interface Jet {
  createProject(args: CreateProjectArgs): Promise<Project>;
}

export function makeJet(config: JcliConfigDotJSON): Jet {
  return {
    async createProject(args: CreateProjectArgs) {
      const logger = getLogger();

      logger.debug(
        `Starting to request jet to create project with arguments: \`${
          Deno.inspect(args)
        }\``,
      );

      const startInstant = performance.now();
      const project = await doCreateProject(args, config);
      const endInstant = performance.now();

      logger.debug(`Request finished in ${endInstant - startInstant}ms.`);

      return project;
    },
  };
}
