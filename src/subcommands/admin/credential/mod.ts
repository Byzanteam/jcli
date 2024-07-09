import { Command } from "@cliffy/command";
import { GlobalOptions } from "@/args.ts";

import addCommand from "@/subcommands/admin/credential/add/mod.ts";
import removeCommand from "@/subcommands/admin/credential/remove/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Commands to manage your projects as an admin.")
  .command("add", addCommand)
  .command("remove", removeCommand);

export default command;
