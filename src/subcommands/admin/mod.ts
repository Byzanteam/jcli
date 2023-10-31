import { Command } from "cliffy";
import { GlobalOptions } from "@/args.ts";

import adminProjectsCommand from "@/subcommands/admin/projects/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Work with admin functionalities.")
  .command("projects", adminProjectsCommand);

export default command;
