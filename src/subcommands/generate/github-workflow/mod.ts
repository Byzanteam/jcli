import { Command } from "cliffy-command";
import errorHandler from "@/error-handler.ts";

import { GithubWorkflowOptions } from "./option.ts";
import action from "./action.ts";

const command = new Command<GithubWorkflowOptions>()
  .description("Generate GitHub Workflow file for deployment")
  .option("-o, --output <output>", "Output path")
  .option("--name <name>", 'Name of the workflow. Default to "Deploy project"')
  .option(
    "--branches <branches>",
    'Branches that trigger deployment. To speicify multiple branches, separate them by comma. Default to "main"',
  )
  .option(
    "--jcli-version <version>",
    "Specify the jcli version to use. Default to latest",
  )
  .option("--jet-endpoint <jetEndpoint>", "Specify the jet endpoint", {
    required: true,
  })
  .option("--project-id <projectId>", "Specify the project ID", {
    required: true,
  })
  .option(
    "--dist-dir <distDir>",
    "Specify the directory containing projects files to deploy. Default to the root directory of the repository",
  )
  .action(action)
  .error(errorHandler);

export default command;
