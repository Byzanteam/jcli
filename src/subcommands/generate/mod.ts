import { Command } from "cliffy";
import { GlobalOptions } from "@/args.ts";

import githubWorkflowCommand from "./github-workflow/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Generate utility files")
  .command("github-workflow", githubWorkflowCommand);

export default command;
