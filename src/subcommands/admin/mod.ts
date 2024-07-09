import { Command } from "@cliffy/command";
import { GlobalOptions } from "@/args.ts";

import adminProjectsCommand from "@/subcommands/admin/projects/mod.ts";
import adminVarCommand from "@/subcommands/admin/var/mod.ts";
import credentialCommand from "@/subcommands/admin/credential/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Work with admin functionalities.")
  .command("projects", adminProjectsCommand)
  .command("var", adminVarCommand)
  .command("credential", credentialCommand);

export default command;
