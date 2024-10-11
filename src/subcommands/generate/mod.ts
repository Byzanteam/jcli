import { Command } from "@cliffy/command";
import { GlobalOptions } from "@/args.ts";

import githubWorkflowCommand from "./github-workflow/mod.ts";
import functionsCommand from "./functions/mod.ts";
import migrationsCommand from "./migrations/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Generate utility files")
  .command("github-workflow", githubWorkflowCommand)
  .command("functions", functionsCommand)
  .command("migrations", migrationsCommand);

export default command;
